from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="/app/verification/video")
    page = context.new_page()

    # Navigate to the app
    page.goto("http://localhost:5173/")
    page.wait_for_timeout(2000) # wait for redirect to /login

    # Since there's no test account we can just inspect the Login page which has a type=number input (OTP)
    # Wait actually, we edited specific files. Login page has type=tel.
    # Tools page has amount input. ExchangeRates has rates.
    # Let's see if we can reach Tools without login.
    # Often /tools is protected.

    # We will just verify compilation and the initial login page as per memory directive:
    # "When verifying frontend features with Playwright, authenticated routes are gated by real Firebase phone authentication (OTP). Automated UI verification for internal routes without a configured test account may be restricted to validating compilation and visually confirming the initial Login page."
    page.screenshot(path="/app/verification/verification.png")
    page.wait_for_timeout(1000)

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
