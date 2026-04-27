from pydantic import BaseModel, Field


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class JoinGroupRequest(BaseModel):
    inviteCode: str | None = None
    groupId: int | None = Field(default=None, ge=1)


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    role: str


class GroupMemberResponse(BaseModel):
    id: int
    firstName: str
    lastName: str
    email: str
    role: str


class GroupDetailResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    role: str
    memberCount: int
    members: list[GroupMemberResponse]


class TransferOwnershipRequest(BaseModel):
    newOwnerId: int = Field(ge=1)


class GroupMemberActionResponse(BaseModel):
    detail: str


class GroupAvailabilitySlotResponse(BaseModel):
    memberId: int
    firstName: str
    lastName: str
    email: str
    role: str
    dayOfWeek: int
    startTime: str
    endTime: str


class GroupAvailabilityResponse(BaseModel):
    groupId: int
    groupName: str
    slots: list[GroupAvailabilitySlotResponse]
