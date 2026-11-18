/**
 * End-to-End tests for Connectors - Playwright E2E tests
 */

import { test, expect } from '@playwright/test'

test.describe('Connectors E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to connectors management page
    await page.goto('/connectors')
  })

  test('should display connector list', async ({ page }) => {
    // Verify connector list is visible
    const connectorList = page.locator('.connector-list')
    await expect(connectorList).toBeVisible()
  })

  test('should select a connector and view details', async ({ page }) => {
    // Click on first connector
    const firstConnector = page.locator('.connector-item').first()
    await firstConnector.click()

    // Verify connector details are visible
    const connectorDetails = page.locator('.connector-details')
    await expect(connectorDetails).toBeVisible()
  })

  test('should register new connector', async ({ page }) => {
    // Click register button
    const registerButton = page.locator('.register-button')
    await registerButton.click()

    // Verify register dialog is visible
    const registerDialog = page.locator('.register-dialog')
    await expect(registerDialog).toBeVisible()
  })

  test('should edit existing connector', async ({ page }) => {
    // Click on first connector
    const firstConnector = page.locator('.connector-item').first()
    await firstConnector.click()

    // Click edit button
    const editButton = page.locator('.edit-button')
    await editButton.click()

    // Verify edit dialog is visible
    const editDialog = page.locator('.edit-dialog')
    await expect(editDialog).toBeVisible()
  })

  test('should delete connector with confirmation', async ({ page }) => {
    // Click on first connector
    const firstConnector = page.locator('.connector-item').first()
    await firstConnector.click()

    // Click delete button
    const deleteButton = page.locator('.delete-button')
    await deleteButton.click()

    // Verify delete confirmation dialog is visible
    const deleteDialog = page.locator('.delete-dialog')
    await expect(deleteDialog).toBeVisible()
  })

  test('should verify connector', async ({ page }) => {
    // Click on first connector
    const firstConnector = page.locator('.connector-item').first()
    await firstConnector.click()

    // Click verify button
    const verifyButton = page.locator('.verify-button')
    await verifyButton.click()

    // Verify verification dialog is visible
    const verifyDialog = page.locator('.verify-dialog')
    await expect(verifyDialog).toBeVisible()
  })

  test('should show error state on API failure', async ({ page }) => {
    // Simulate API error
    await page.route('**/api/connectors', route => route.abort())

    // Try to load connectors
    const connectorList = page.locator('.connector-list')
    await expect(connectorList).toBeVisible()

    // Verify error message is shown
    const errorMessage = page.locator('.error-message')
    await expect(errorMessage).toContainText('Failed to load connectors')
  })

  test('should filter connectors by app_name', async ({ page }) => {
    // Click filter button
    const filterButton = page.locator('.filter-button')
    await filterButton.click()

    // Verify filter dialog is visible
    const filterDialog = page.locator('.filter-dialog')
    await expect(filterDialog).toBeVisible()
  })

  test('should search connectors by name', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('.search-input')
    await searchInput.fill('Test Connector')

    // Verify search is performed
    const filteredConnectors = page.locator('.connector-item').filter({ hasText: 'Test Connector' })
    await expect(filteredConnectors).toBeVisible()
  })
})
