from playwright.sync_api import sync_playwright
import time

def test_inputs():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.goto("http://localhost:5173/")
        page.wait_for_load_state("networkidle")

        try:
            # Look for the phone input which should be present on the login screen
            phone_input = page.locator('input[type="tel"]').first
            if phone_input.count() > 0:
                input_mode = phone_input.get_attribute('inputmode')
                print(f"Phone input found. inputMode='{input_mode}'")
            else:
                print("Phone input not found on initial screen.")

        except Exception as e:
            print(f"Error during verification: {e}")

        browser.close()

if __name__ == "__main__":
    test_inputs()
