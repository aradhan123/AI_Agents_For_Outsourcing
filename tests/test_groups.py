def _register(client, email: str) -> str:
    response = client.post(
        "/auth/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": email,
            "password": "supersecret123",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_create_group_and_list_membership(client):
    access = _register(client, "owner@example.com")

    created = client.post(
        "/groups/",
        headers={"Authorization": f"Bearer {access}"},
        json={"name": "Design Team", "description": "Product and design planning"},
    )
    assert created.status_code == 200, created.text
    created_json = created.json()
    assert created_json["name"] == "Design Team"
    assert created_json["role"] == "owner"

    listing = client.get("/groups/", headers={"Authorization": f"Bearer {access}"})
    assert listing.status_code == 200, listing.text
    groups = listing.json()
    assert len(groups) == 1
    assert groups[0]["name"] == "Design Team"
    assert groups[0]["role"] == "owner"


def test_join_group_by_id_and_prevent_duplicate_membership(client):
    owner_access = _register(client, "owner2@example.com")
    created = client.post(
        "/groups/",
        headers={"Authorization": f"Bearer {owner_access}"},
        json={"name": "Engineering"},
    )
    assert created.status_code == 200, created.text
    group_id = created.json()["id"]

    member_access = _register(client, "member@example.com")

    joined = client.post(
        "/groups/join",
        headers={"Authorization": f"Bearer {member_access}"},
        json={"groupId": group_id},
    )
    assert joined.status_code == 200, joined.text
    assert joined.json()["role"] == "member"

    duplicate = client.post(
        "/groups/join",
        headers={"Authorization": f"Bearer {member_access}"},
        json={"groupId": group_id},
    )
    assert duplicate.status_code == 409


def test_group_members_can_view_group_availability_and_non_members_cannot(client):
    owner_access = _register(client, "owner3@example.com")
    created = client.post(
        "/groups/",
        headers={"Authorization": f"Bearer {owner_access}"},
        json={"name": "Product"},
    )
    assert created.status_code == 200, created.text
    group_id = created.json()["id"]

    owner_slots = [
        {"day_of_week": 1, "start_time": "09:00:00", "end_time": "12:00:00"},
        {"day_of_week": 3, "start_time": "13:00:00", "end_time": "15:30:00"},
    ]
    saved = client.post(
        "/availability/",
        headers={"Authorization": f"Bearer {owner_access}"},
        json=owner_slots,
    )
    assert saved.status_code == 200, saved.text

    member_access = _register(client, "member2@example.com")
    joined = client.post(
        "/groups/join",
        headers={"Authorization": f"Bearer {member_access}"},
        json={"groupId": group_id},
    )
    assert joined.status_code == 200, joined.text

    member_slots = [
        {"day_of_week": 1, "start_time": "10:00:00", "end_time": "11:00:00"},
        {"day_of_week": 4, "start_time": "14:00:00", "end_time": "17:00:00"},
    ]
    saved_member = client.post(
        "/availability/",
        headers={"Authorization": f"Bearer {member_access}"},
        json=member_slots,
    )
    assert saved_member.status_code == 200, saved_member.text

    owner_view = client.get(
        f"/groups/{group_id}/availability",
        headers={"Authorization": f"Bearer {owner_access}"},
    )
    assert owner_view.status_code == 200, owner_view.text
    payload = owner_view.json()
    assert payload["groupId"] == group_id
    assert len(payload["slots"]) == 4

    member_view = client.get(
        f"/groups/{group_id}/availability",
        headers={"Authorization": f"Bearer {member_access}"},
    )
    assert member_view.status_code == 200, member_view.text
    payload = member_view.json()
    assert payload["groupId"] == group_id
    assert len(payload["slots"]) == 4

    outsider_access = _register(client, "outsider@example.com")
    forbidden = client.get(
        f"/groups/{group_id}/availability",
        headers={"Authorization": f"Bearer {outsider_access}"},
    )
    assert forbidden.status_code == 403


def test_owner_can_transfer_ownership_and_remove_member(client):
    owner_access = _register(client, "owner4@example.com")
    created = client.post(
        "/groups/",
        headers={"Authorization": f"Bearer {owner_access}"},
        json={"name": "Operations"},
    )
    assert created.status_code == 200, created.text
    group_id = created.json()["id"]

    member_access = _register(client, "member3@example.com")
    joined = client.post(
        "/groups/join",
        headers={"Authorization": f"Bearer {member_access}"},
        json={"groupId": group_id},
    )
    assert joined.status_code == 200, joined.text

    member_view = client.get("/groups/", headers={"Authorization": f"Bearer {member_access}"})
    assert member_view.status_code == 200, member_view.text
    assert member_view.json()[0]["role"] == "member"

    detail = client.get(f"/groups/{group_id}", headers={"Authorization": f"Bearer {owner_access}"})
    assert detail.status_code == 200, detail.text
    member_id = next(m["id"] for m in detail.json()["members"] if m["role"] == "member")

    transferred = client.post(
        f"/groups/{group_id}/transfer-ownership",
        headers={"Authorization": f"Bearer {owner_access}"},
        json={"newOwnerId": member_id},
    )
    assert transferred.status_code == 200, transferred.text

    owner_view_after = client.get("/groups/", headers={"Authorization": f"Bearer {owner_access}"})
    assert owner_view_after.status_code == 200, owner_view_after.text
    assert owner_view_after.json()[0]["role"] == "member"

    member_view_after = client.get("/groups/", headers={"Authorization": f"Bearer {member_access}"})
    assert member_view_after.status_code == 200, member_view_after.text
    assert member_view_after.json()[0]["role"] == "owner"

    removed = client.delete(
        f"/groups/{group_id}/members/{member_id}",
        headers={"Authorization": f"Bearer {owner_access}"},
    )
    assert removed.status_code == 403

    detail_after_transfer = client.get(f"/groups/{group_id}", headers={"Authorization": f"Bearer {member_access}"})
    assert detail_after_transfer.status_code == 200, detail_after_transfer.text
    old_owner_id = next(m["id"] for m in detail_after_transfer.json()["members"] if m["role"] == "member")

    removed_old_owner = client.delete(
        f"/groups/{group_id}/members/{old_owner_id}",
        headers={"Authorization": f"Bearer {member_access}"},
    )
    assert removed_old_owner.status_code == 200, removed_old_owner.text
