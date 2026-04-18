def test_regenerate_report_returns_summary_for_month(
    client,
    auth_headers,
    seeded_month_data,
):
    _ = seeded_month_data

    response = client.post("/reports/2026-04/regenerate", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["month_key"] == "2026-04"
    assert body["totals"]["overall"] == "2275.50"
    assert body["totals"]["common"] == "425.00"
