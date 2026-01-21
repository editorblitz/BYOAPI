"""
Flask extensions module.
Initializes extensions that need to be shared across modules.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Rate limiter - initialized without app, call init_app() later
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["5000 per day", "1000 per hour"],
    storage_uri="memory://"
)
