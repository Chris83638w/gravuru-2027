#!/usr/bin/env python3
"""Read-only, fixed-target Plesk access check. Never prints credentials."""
import base64
import datetime
import json
import os
import shutil
import subprocess
import sys

URL = "https://gravuru.highspeed.cloud:8443/api/v2/server"
NAMES = ("GRAVURU_PLESK_USERNAME", "GRAVURU_PLESK_PASSWORD")
ERRORS = {5: "proxy_dns", 6: "destination_dns", 7: "connection_failed",
          28: "timeout", 35: "tls_handshake", 60: "certificate_validation",
          77: "ca_configuration", 97: "proxy_handshake"}

def request(authorization=None):
    config = 'header = "Authorization: Basic ' + authorization + '"\n' if authorization else ""
    args = ["curl", "--disable", "--config", "-", "--request", "GET",
            "--url", URL, "--proto", "=https", "--max-redirs", "0",
            "--connect-timeout", "8", "--max-time", "15", "--silent",
            "--output", os.devnull, "--write-out",
            "%{http_code} %{http_connect} %{ssl_verify_result}"]
    try:
        result = subprocess.run(args, input=config, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=20, check=False)
    except subprocess.TimeoutExpired:
        return {"curl_exit": None, "error": "process_timeout"}
    except OSError:
        return {"curl_exit": None, "error": "executor_error"}
    # Never print stderr: it may contain authentication or infrastructure data.
    fields = result.stdout.strip().split()
    metrics = fields if len(fields) == 3 and all(x.isdigit() for x in fields) else None
    return {
        "curl_exit": result.returncode,
        "http_status": int(metrics[0]) if metrics and metrics[0] != "000" else None,
        "proxy_connect_status": int(metrics[1]) if metrics and metrics[1] != "000" else None,
        "tls_verify_result": int(metrics[2]) if metrics else None,
        "error": ERRORS.get(result.returncode, "transport_error") if result.returncode else None,
    }

def proxy_excludes_target():
    exclusions = os.environ.get("no_proxy") or os.environ.get("NO_PROXY", "")
    host = "gravuru.highspeed.cloud"
    for entry in exclusions.split(","):
        entry = entry.strip().lower()
        if not entry:
            continue
        if "*" in entry or "/" in entry:
            return True
        candidate = entry.lstrip(".").split(":")[0]
        if candidate and (host == candidate or host.endswith("." + candidate)):
            return True
    return False

def main():
    values = [os.environ.get(name, "") for name in NAMES]
    report = {"checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "target": URL, "variables_present": dict(zip(NAMES, map(bool, values))),
              "authenticated": None}
    # Require the inherited proxy. Never establish a direct route as fallback.
    proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
    if not proxy:
        report["outcome"] = "missing_https_proxy"
    elif proxy_excludes_target():
        # Refuse ambiguous proxy exclusions instead of modifying the inherited policy.
        report["outcome"] = "proxy_exclusions_require_review"
    elif not shutil.which("curl"):
        report["outcome"] = "curl_missing"
    else:
        report["unauthenticated"] = first = request()
        if first.get("curl_exit") != 0 or first.get("tls_verify_result") != 0:
            report["outcome"] = "transport_failed_before_auth"
        elif first.get("http_status") != 401:
            report["outcome"] = "unexpected_unauthenticated_status"
        elif not all(values):
            report["outcome"] = "missing_personal_variables"
        else:
            token = base64.b64encode((values[0] + ":" + values[1]).encode()).decode("ascii")
            report["authenticated"] = auth = request(token)
            report["outcome"] = ("authenticated_read_ok"
                if auth.get("curl_exit") == 0 and auth.get("http_status") == 200
                and auth.get("tls_verify_result") == 0 else "authenticated_read_failed")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["outcome"] == "authenticated_read_ok" else 2

if __name__ == "__main__":
    sys.exit(main())
