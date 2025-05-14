from playwright.sync_api import Page, expect,sync_playwright

def test_download_pdfs():
    with sync_playwright() as p:
        # Launch the browser
        browser = p.chromium.launch(headless=False)  # Set headless=True to run without a UI
        context = browser.new_context()
        page = context.new_page()

        # Go to the page with the table
        school_results_page = 'https://cifrhs.salud.gob.mx/site1/enarm/reportes_academicos.html'
        page.goto(school_results_page)

        # Expects page to have a heading with the name of the target heading
        expect(page.get_by_role("heading", name="Resultados de la Evaluación Nacional de Aspirantes a Residencias Médicas 2023")).to_be_visible()

        # Locate the table
        table = page.locator('table')

        # Get all the links in the table
        links = table.locator('a')

        # Download each PDF
        for i in range(links.count()):
            link = links.nth(i)
            if link.get_attribute('href').endswith('.pdf'):
                link.click()
                page.wait_for_timeout(1000)  # Wait for download to complete

        # Close the browser
        browser.close()

# Run the function
test_download_pdfs()