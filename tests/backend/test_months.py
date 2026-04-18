def test_months_endpoint_returns_available_months(client, auth_headers, seeded_month_data):
    _ = seeded_month_data

    response = client.get("/months", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == ["2026-04"]
