from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, EmailStr


UserRole = Literal["USER", "IT_SUPPORT", "IT_MANAGER", "ADMIN"]


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=150)
    job_position: str | None = Field(default=None, max_length=150)
    role: UserRole = "USER"


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=150)
    job_position: str | None = Field(default=None, max_length=150)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    email: str | None
    department: str | None
    job_position: str | None
    role: str
    is_active: bool
    must_change_password: bool