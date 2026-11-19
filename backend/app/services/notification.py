import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_telegram_message(message: str):
    if not settings.TELEGRAM_ENABLED:
        return

    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        logger.warning("Telegram notification is not configured")
        return

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )

            response.raise_for_status()

    except Exception:
        logger.exception("Failed to send Telegram notification")