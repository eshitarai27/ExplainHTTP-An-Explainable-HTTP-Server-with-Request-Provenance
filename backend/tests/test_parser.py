"""Unit tests for core.parser: request-line/header parsing and chunked decoding."""
from __future__ import annotations

import pytest

from core.parser import HTTPParseError, decode_chunked, parse_request_head, split_target


def test_parses_simple_get_request():
    head = b"GET /hello HTTP/1.1\r\nHost: localhost\r\nAccept: */*\r\n"
    method, target, version, headers = parse_request_head(head)
    assert method == "GET"
    assert target == "/hello"
    assert version == "HTTP/1.1"
    assert headers == {"host": "localhost", "accept": "*/*"}


def test_header_keys_are_case_insensitive():
    head = b"POST /echo HTTP/1.1\r\nContent-Type: application/json\r\nCONTENT-LENGTH: 10\r\n"
    _, _, _, headers = parse_request_head(head)
    assert headers["content-type"] == "application/json"
    assert headers["content-length"] == "10"


def test_rejects_malformed_request_line():
    with pytest.raises(HTTPParseError):
        parse_request_head(b"GET /hello\r\n")


def test_rejects_unsupported_http_version():
    with pytest.raises(HTTPParseError):
        parse_request_head(b"GET / HTTP/2.0\r\n")


def test_rejects_malformed_header_line():
    with pytest.raises(HTTPParseError):
        parse_request_head(b"GET / HTTP/1.1\r\nNotAHeader\r\n")


def test_rejects_empty_request():
    with pytest.raises(HTTPParseError):
        parse_request_head(b"")


def test_split_target_extracts_path_and_query():
    path, query = split_target("/search?q=explainhttp&page=2")
    assert path == "/search"
    assert query == {"q": ["explainhttp"], "page": ["2"]}


def test_split_target_defaults_to_root_path():
    path, query = split_target("")
    assert path == "/"
    assert query == {}


def test_decode_chunked_body():
    raw = b"4\r\nWiki\r\n5\r\npedia\r\n0\r\n\r\n"
    assert decode_chunked(raw) == b"Wikipedia"


def test_decode_chunked_empty_body():
    raw = b"0\r\n\r\n"
    assert decode_chunked(raw) == b""


def test_decode_chunked_rejects_invalid_size():
    with pytest.raises(HTTPParseError):
        decode_chunked(b"zz\r\nabc\r\n0\r\n\r\n")
