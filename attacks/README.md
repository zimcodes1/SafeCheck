# SafeCheck attack scripts

`malformed_packet/attack.py` exercises the passive packet sensor's Layer-1
validation using raw TCP bytes. Start the Plant and privileged Backend first,
then run from this directory:

```bash
uv run python malformed_packet/attack.py --case bad-protocol
```

Available cases are `bad-protocol`, `truncated`, `bad-function`, and
`bad-register`. The resulting warning alert includes the raw packet hex.
