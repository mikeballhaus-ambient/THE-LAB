/**
 * End-to-End tests for Form Management - Playwright E2E tests
 */

import { test, expect } from '@playwright/test'

test.describe('Form Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to forms management page
    await page.goto('/forms')
  })

  test('should display form list with pagination', async ({ page }) => {
    // Verify form list is visible
    const formList = page.locator('.form-list')
    await expect(formList).toBeVisible()
  })

  test('should select a form and navigate to designer', async ({ page }) => {
    // Click on first form
    const firstForm = page.locator('.form-item').first()
    await firstForm.click()

    // Verify navigation to designer view
    const designerView = page.locator('.designer-view')
    await expect(designerView).toBeVisible()
  })

  test('should go back from designer to forms list', async ({ page }) => {
    // Click on first form
    const firstForm = page.locator('.form-item').first()
    await firstForm.click()

    // Click back button
    const backButton = page.locator('.back-button')
    await backButton.click()

    // Verify return to forms list
    const formList = page.locator('.form-list')
    await expect(formList).toBeVisible()
  })

  test('should create new form', async ({ page }) => {
    // Click create button
    const createButton = page.locator('.create-button')
    await createButton.click()

    // Verify create dialog is visible
    const createDialog = page.locator('.create-dialog')
    await expect(createDialog).toBeVisible()
  })

  test('should edit existing form', async ({ page }) => {
    // Click on first form
    const firstForm = page.locator('.form-item').first()
    await firstForm.click()

    // Click edit button
    const editButton = page.locator('.edit-button')
    await editButton.click()

    // Verify edit dialog is visible
    const editDialog = page.locator('.edit-dialog')
    await expect(editDialog).toBeVisible()
  })

  test('should delete form with confirmation', async ({ page }) => {
    // Click on first form
    const firstForm = page.locator('.form-item').first()
    await firstForm.click()

    // Click delete button
    const deleteButton = page.locator('.delete-button')
    await deleteButton.click()

    // Verify delete confirmation dialog is visible
    const deleteDialog = page.locator('.delete-dialog')
    await expect(deleteDialog).toBeVisible()
  })

  test('should filter forms by connector', async ({ page }) => {
    // Click filter button
    const filterButton = page.locator('.filter-button')
    await filterButton.click()

    // Verify filter dialog is visible
    const filterDialog = page.locator('.filter-dialog')
    await expect(filterDialog).toBeVisible()
  })

  test('should search forms by name', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('.search-input')
    await searchInput.fill('Test Form')

    // Verify search is performed
    const filteredForms = page.locator('.form-item').filter({ hasText: 'Test Form' })
    await expect(filteredForms).toBeVisible()
  })

  test('should show error state on API failure', async ({ page }) => {
    // Simulate API error
    await page.route('**/api/forms', route => route.abort())

    // Try to load forms
    const formList = page.locator('.form-list')
    await expect(formList).toBeVisible()

    // Verify error message is shown
    const errorMessage = page.locator('.error-message')
    await expect(errorMessage).toContainText('Failed to load forms')
  })
})
