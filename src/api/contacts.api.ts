// src/api/contacts.api.ts

import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../database/connection';
import { validateContactInput } from '../utils/validation';
import { CommonErrors, ErrorCodes, createError } from '../utils/errors';
import type { Contact, CreateContactInput } from '../types';

const contactsApi = new Hono();

// For now, use a hardcoded user ID (will add auth later)
const TEST_USER_ID = 'test-user-001';

// GET /api/contacts - List all contacts
contactsApi.get('/', (c) => {
  try {
    const contacts = query<Contact>(
      'SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC',
      [TEST_USER_ID]
    );
    return c.json({ contacts, count: contacts.length });
  } catch (error) {
    console.error('Error listing contacts:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// GET /api/contacts/:id - Get single contact
contactsApi.get('/:id', (c) => {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json(createError('Contact ID is required', ErrorCodes.MISSING_FIELD), 400);
    }
    
    const contact = queryOne<Contact>(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (!contact) {
      return c.json(CommonErrors.contactNotFound(), 404);
    }
    
    return c.json({ contact });
  } catch (error) {
    console.error('Error getting contact:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/contacts - Create contact
contactsApi.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateContactInput>();
    
    // Validate input
    const validation = validateContactInput(body);
    if (!validation.valid) {
      return c.json(CommonErrors.validationFailed(validation.errors), 400);
    }
    
    const id = uuid();
    
    try {
      execute(
        `INSERT INTO contacts (id, user_id, email, first_name, last_name, company, job_title, location, linkedin_url, custom_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          TEST_USER_ID,
          body.email.trim().toLowerCase(),
          body.first_name?.trim() || null,
          body.last_name?.trim() || null,
          body.company?.trim() || null,
          body.job_title?.trim() || null,
          body.location?.trim() || null,
          body.linkedin_url?.trim() || null,
          JSON.stringify(body.custom_data || {}),
        ]
      );
      
      const contact = queryOne<Contact>('SELECT * FROM contacts WHERE id = ?', [id]);
      return c.json({ contact }, 201);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
        return c.json(CommonErrors.alreadyExists('Contact with this email'), 409);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating contact:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// POST /api/contacts/bulk - Bulk import contacts
contactsApi.post('/bulk', async (c) => {
  try {
    const body = await c.req.json<{ contacts: CreateContactInput[] }>();
    
    if (!body.contacts || !Array.isArray(body.contacts)) {
      return c.json(createError('contacts array is required', ErrorCodes.VALIDATION_ERROR), 400);
    }
    
    if (body.contacts.length === 0) {
      return c.json(createError('contacts array cannot be empty', ErrorCodes.VALIDATION_ERROR), 400);
    }
    
    if (body.contacts.length > 1000) {
      return c.json(createError('Maximum 1000 contacts per bulk import', ErrorCodes.VALIDATION_ERROR), 400);
    }
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < body.contacts.length; i++) {
      const contact = body.contacts[i];
      
      // Validate each contact
      const validation = validateContactInput(contact);
      if (!validation.valid) {
        skipped++;
        errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
        continue;
      }
      
      try {
        execute(
          `INSERT INTO contacts (id, user_id, email, first_name, last_name, company, job_title, location, linkedin_url, custom_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuid(),
            TEST_USER_ID,
            contact.email.trim().toLowerCase(),
            contact.first_name?.trim() || null,
            contact.last_name?.trim() || null,
            contact.company?.trim() || null,
            contact.job_title?.trim() || null,
            contact.location?.trim() || null,
            contact.linkedin_url?.trim() || null,
            JSON.stringify(contact.custom_data || {}),
          ]
        );
        imported++;
      } catch (error: any) {
        skipped++;
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
          errors.push(`Row ${i + 1}: Email ${contact.email} already exists`);
        } else {
          errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        }
      }
    }
    
    return c.json({ 
      success: true,
      imported, 
      skipped, 
      total: body.contacts.length,
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (error) {
    console.error('Error bulk importing contacts:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

// DELETE /api/contacts/:id - Delete contact
contactsApi.delete('/:id', (c) => {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json(createError('Contact ID is required', ErrorCodes.MISSING_FIELD), 400);
    }
    
    // Check if contact is in any active campaigns
    const activeLead = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM campaign_leads cl
       JOIN campaigns ca ON cl.campaign_id = ca.id
       WHERE cl.contact_id = ? AND ca.status = 'active' AND cl.status NOT IN ('completed', 'replied', 'bounced', 'failed')`,
      [id]
    );
    
    if (activeLead && activeLead.count > 0) {
      return c.json(
        createError('Cannot delete contact that is in active campaigns', ErrorCodes.INVALID_STATE),
        409
      );
    }
    
    const result = execute(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [id, TEST_USER_ID]
    );
    
    if (result.changes === 0) {
      return c.json(CommonErrors.contactNotFound(), 404);
    }
    
    return c.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return c.json(CommonErrors.internalError(), 500);
  }
});

export { contactsApi };
