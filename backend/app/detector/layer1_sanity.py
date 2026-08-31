from app.schemas.command import CommandIn
from typing import List
from app.models.command import CommandType

def check_sanity(command:CommandIn) -> str | List[str]:
    """This function performs basic sanity checks on `commands` that are passed to it as parameters by comparing them to the `CommandsOut` schema.\n
        **OUTPUTS:** `str` or `List[str]`
        - PASS
        - ["FAIL", "Failure message!"]
    """
    if type(command.command_type) == type(CommandIn.command_type) and command.source_id is not None and command.value is bool:
        return "PASS"
    if type(command.command_type) != type(CommandIn.command_type):
        return ["FAIL", "Command type is invalid!"]
    elif command.source_id is None:
        return ["FAIL", "Command source is undefined!"]
    else:
        return ["FAIL", "Command value is invalid"]

# Test sanity checker
# Run standalone

if __name__ == "__main__":
    command:CommandIn = CommandIn(command_type=CommandType.PUMP,value=True, source_id="Azimeh")
    check_sanity(command)