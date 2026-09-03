from app.schemas.command import CommandIn
from typing import Tuple, Optional
from app.models.command import CommandType


def check_sanity(command: CommandIn) -> Tuple[bool, Optional[str]]:
    """Perform basic sanity checks on an incoming `CommandIn`.

    Returns a tuple `(ok, message)` where `ok` is True when the command
    passes sanity checks and `message` is None on success or a short failure
    reason on error.
    """
    # command_type must be a known CommandType
    if not isinstance(command.command_type, CommandType):
        return False, "Invalid command_type"

    # value must be a boolean
    if not isinstance(command.value, bool):
        return False, "Invalid command value (must be boolean)"

    # source_id must be a non-empty string
    if not command.source_id or not isinstance(command.source_id, str):
        return False, "Missing or invalid source_id"

    return True, None


if __name__ == "__main__":
    # quick smoke when run directly
    from app.models.command import CommandType as CT
    cmd = CommandIn(command_type=CT.PUMP, value=True, source_id="az")
    print(check_sanity(cmd))