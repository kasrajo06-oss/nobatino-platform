import re
import secrets
import string

from django.core.exceptions import ValidationError

_FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
_AR_DIGITS = "٠١٢٣٤٥٦٧٨٩"
_DIGIT_TABLE = str.maketrans(_FA_DIGITS + _AR_DIGITS, "0123456789" * 2)
_CHAR_TABLE = str.maketrans({"ي": "ی", "ك": "ک", "ى": "ی", "ة": "ه", "ۀ": "ه", "أ": "ا", "إ": "ا", "‌": " "})
_SHORT_ID_ALPHABET = string.ascii_letters + string.digits


def to_en_digits(value: str) -> str:
    return (value or "").translate(_DIGIT_TABLE)


def normalize_fa(text: str) -> str:
    """Normalize Persian text for search: unify Arabic letters, digits, ZWNJ and whitespace."""
    text = to_en_digits(text or "").translate(_CHAR_TABLE).lower()
    text = re.sub(r"[ً-ْ]", "", text)  # diacritics
    return re.sub(r"\s+", " ", text).strip()


def normalize_mobile(value: str) -> str:
    """Return mobile in 09xxxxxxxxx form or raise ValidationError."""
    digits = re.sub(r"\D", "", to_en_digits(value or ""))
    if digits.startswith("0098"):
        digits = "0" + digits[4:]
    elif digits.startswith("98") and len(digits) == 12:
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    if not re.fullmatch(r"09\d{9}", digits):
        raise ValidationError("شماره موبایل معتبر نیست.")
    return digits


def is_valid_national_code(code: str) -> bool:
    code = to_en_digits(code or "")
    if not re.fullmatch(r"\d{10}", code) or len(set(code)) == 1:
        return False
    check = int(code[9])
    s = sum(int(code[i]) * (10 - i) for i in range(9)) % 11
    return check == s if s < 2 else check == 11 - s


def validate_national_code(code: str):
    if not is_valid_national_code(code):
        raise ValidationError("کد ملی معتبر نیست.")


def generate_short_id(length: int = 6) -> str:
    return "".join(secrets.choice(_SHORT_ID_ALPHABET) for _ in range(length))


def generate_numeric_code(length: int) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def slugify_fa(text: str) -> str:
    """Slug that keeps Persian letters (URLs like /doctors/city/تهران are valid)."""
    text = normalize_fa(text)
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_]+", "-", text).strip("-")
