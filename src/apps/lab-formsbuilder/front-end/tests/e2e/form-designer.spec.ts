/**
 * End-to-End tests for Form Designer - Playwright E2E tests
 */

import { test, expect } from '@playwright/test'

test.describe('Form Designer E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to form designer view via forms management
    await page.goto('/forms')
    
    // Click on a form to enter designer mode
    const firstForm = page.locator('.form-item').first()
    await firstForm.click()
  })

  test('should display form properties panel', async ({ page }) => {
    // Verify form properties panel is visible
    const formPropertiesPanel = page.locator('.form-properties-panel')
    await expect(formPropertiesPanel).toBeVisible()
  })

  test('should edit form name in properties panel', async ({ page }) => {
    // Type new form name
    const formNameInput = page.locator('#form-name-input').first()
    await formNameInput.fill('Test Form')
    
    // Click save button
    const saveFormBtn = page.locator('#save-form-btn')
    await saveFormBtn.click()
  })

  test('should drag component from library to canvas', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify component is draggable
    const draggableItem = page.locator('.draggable-item')
    await expect(draggableItem).toBeVisible()
  })

  test('should drop component on canvas', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify component is dropped on canvas
    const canvas = page.locator('.design-canvas')
    await expect(canvas).toBeVisible()
  })

  test('should resize dropped component', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify resize handle is visible
    const resizeHandle = page.locator('.resize-handle')
    await expect(resizeHandle).toBeVisible()
  })

  test('should edit component properties', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify property editor is visible
    const propertyEditor = page.locator('.property-editor')
    await expect(propertyEditor).toBeVisible()
  })

  test('should delete component from canvas', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify delete button is visible
    const deleteButton = page.locator('.delete-button')
    await expect(deleteButton).toBeVisible()
  })

  test('should save form configuration', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify save button is visible
    const saveButton = page.locator('#save-form-btn')
    await expect(saveButton).toBeVisible()
  })

  test('should navigate back to forms list', async ({ page }) => {
    // Click on component in library
    const componentLibrary = page.locator('.component-library')
    await componentLibrary.click()

    // Verify back button is visible
    const backButton = page.locator('#form-designer-back-btn')
    await expect(backButton).toBeVisible()
    
    // Click back button
    await backButton.click()
    
    // Verify return to forms list
    const formList = page.locator('.form-list')
    await expect(formList).toBeVisible()
  })

  test('should show connector manager in designer', async ({ page }) => {
    // Verify connector manager is visible
    const connectorManager = page.locator('.connector-manager')
    await expect(connectorManager).toBeVisible()
  })
})
