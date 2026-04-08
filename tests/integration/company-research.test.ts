import { test, expect, vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('Company Research Integration', () => {
  test('returns fallback on all failures', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Network fail'));

    const response = await axios.post('http://localhost:3000/api/company-research', {
      company: 'testco'
    });

    expect(response.data).toHaveProperty('overview');
    expect(response.data).toHaveProperty('culture');
    expect(response.data).toHaveProperty('hiring_focus');
    expect(response.data).toHaveProperty('keywords', expect.any(Array));
    expect(response.data).toHaveProperty('outreach_angle');
    expect(response.status).toBe(200);
  });

  test('handles empty company', async () => {
    const response = await axios.post('http://localhost:3000/api/company-research', {});

    expect(response.status).toBe(400);
    expect(response.data.error).toMatch(/company name required/);
  });

  test('short company name rejected', async () => {
    const response = await axios.post('http://localhost:3000/api/company-research', {
      company: 'a'
    });

    expect(response.status).toBe(400);
  });
});

