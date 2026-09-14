"""Put contracts/py on sys.path.

Both api/ and models/ import the frozen contracts from contracts/py/contracts.py. Rather than
publishing that as a package and making everyone run an install step, each service imports this
module first - it is zero-config and works the moment you clone.

    import _contracts_path  # noqa: F401
    from contracts import Signal, Decision

Do not "clean this up" by copying contracts.py into a service. Two copies drift, and the whole
point of contracts/ is that drift is impossible.
"""

import pathlib
import sys

_CONTRACTS = pathlib.Path(__file__).resolve().parent.parent / "contracts" / "py"

if str(_CONTRACTS) not in sys.path:
    sys.path.insert(0, str(_CONTRACTS))
