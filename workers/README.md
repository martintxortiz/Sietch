# MetaTrader 5 sync worker

This process must run on a Windows machine with MetaTrader 5 installed. The
official Python package connects to the desktop terminal, so it cannot run in a
Supabase Edge Function.

1. Install Python 3.10–3.14 and MetaTrader 5.
2. Run `py -m pip install -r workers/requirements.txt`.
3. Set the variables from `workers/.env.example` in the process environment.
4. Run `py workers/mt5_sync.py` or `py workers/mt5_sync.py --once`.

Keep the service-role key only on this worker. Never expose it through a
`NEXT_PUBLIC_` variable or commit it.
