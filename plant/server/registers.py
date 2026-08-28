"""
Modbus register address mapping for the SafeCheck Plant server.
Shared contract between Plant, Backend, Legit Client, and Attack scripts.
"""

# Holding registers (writable - client commands)
PUMP_COMMAND_REGISTER = 0     # 0 = off, 1 = on
VALVE_COMMAND_REGISTER = 1    # 0 = closed, 1 = open

# Input registers (read-only - sensor readings and plant status)
# Register numbers are Modbus addresses/indexes, not the values stored in them.
WATER_LEVEL_REGISTER = 0      # 0-100 (percentage)
PUMP_STATUS_REGISTER = 1      # 0 = off, 1 = on
VALVE_STATUS_REGISTER = 2     # register index; value is 0 = closed, 1 = open

