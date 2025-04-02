import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract calls
const mockContractCalls = {
  'license-terms': {
    'get-license': (id) => {
      if (id === 1) {
        return {
          'ip-id': 1,
          licensor: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          'license-type': 'commercial',
          'usage-rights': 'Full usage rights for commercial purposes',
          'royalty-percentage': 1000,
          duration: 31536000,
          'created-at': Date.now() - 86400000, // 1 day ago
          active: true
        };
      }
      return null;
    },
    'get-licensee-agreement': (licensee, licenseId) => {
      if (licenseId === 1 && licensee === 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM') {
        const currentTime = Date.now();
        return {
          accepted: true,
          'accepted-at': currentTime - 86400000, // 1 day ago
          'expires-at': currentTime + 31449600000, // 364 days from now
          active: true
        };
      }
      return null;
    }
  },
  'usage-tracking': {
    lastUsageId: 0,
    usageRecords: new Map(),
    licenseUsage: new Map(),
    licenseeUsage: new Map(),
    
    'get-usage-record': (id) => {
      return mockContractCalls['usage-tracking'].usageRecords.get(id) || null;
    },
    
    'get-license-usage-records': (licenseId) => {
      return mockContractCalls['usage-tracking'].licenseUsage.get(licenseId) || { 'usage-ids': [] };
    },
    
    'get-licensee-usage-records': (licensee) => {
      return mockContractCalls['usage-tracking'].licenseeUsage.get(licensee) || { 'usage-ids': [] };
    },
    
    'record-usage': (sender, licenseId, usageType, usageAmount) => {
      // Verify license exists
      const license = mockContractCalls['license-terms']['get-license'](licenseId);
      if (!license) return { error: 404 };
      
      // Verify agreement exists and is active
      const agreement = mockContractCalls['license-terms']['get-licensee-agreement'](sender, licenseId);
      if (!agreement) return { error: 404 };
      if (!agreement.active) return { error: 403 };
      
      // Verify agreement has not expired
      const currentTime = Date.now();
      if (agreement['expires-at'] < currentTime) return { error: 403 };
      
      const newId = mockContractCalls['usage-tracking'].lastUsageId + 1;
      
      mockContractCalls['usage-tracking'].usageRecords.set(newId, {
        'license-id': licenseId,
        licensee: sender,
        'usage-type': usageType,
        'usage-amount': usageAmount,
        timestamp: currentTime,
        verified: false
      });
      
      // Update license usage records
      const licenseUsageRecords = mockContractCalls['usage-tracking'].licenseUsage.get(licenseId) || { 'usage-ids': [] };
      licenseUsageRecords['usage-ids'].push(newId);
      mockContractCalls['usage-tracking'].licenseUsage.set(licenseId, licenseUsageRecords);
      
      // Update licensee usage records
      const licenseeUsageRecords = mockContractCalls['usage-tracking'].licenseeUsage.get(sender) || { 'usage-ids': [] };
      licenseeUsageRecords['usage-ids'].push(newId);
      mockContractCalls['usage-tracking'].licenseeUsage.set(sender, licenseeUsageRecords);
      
      mockContractCalls['usage-tracking'].lastUsageId = newId;
      return { value: newId };
    },
    
    'verify-usage': (sender, usageId) => {
      const usageData = mockContractCalls['usage-tracking'].usageRecords.get(usageId);
      if (!usageData) return { error: 404 };
      
      const licenseData = mockContractCalls['license-terms']['get-license'](usageData['license-id']);
      if (!licenseData) return { error: 404 };
      
      // Only the licensor can verify usage
      if (licenseData.licensor !== sender) return { error: 403 };
      
      usageData.verified = true;
      mockContractCalls['usage-tracking'].usageRecords.set(usageId, usageData);
      
      return { value: true };
    }
  }
};

// Mock the contract-call function
const contractCall = (contract, method, ...args) => {
  const sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Default test sender
  return mockContractCalls[contract][method](sender, ...args);
};

describe('Usage Tracking Contract', () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractCalls['usage-tracking'].lastUsageId = 0;
    mockContractCalls['usage-tracking'].usageRecords = new Map();
    mockContractCalls['usage-tracking'].licenseUsage = new Map();
    mockContractCalls['usage-tracking'].licenseeUsage = new Map();
  });
  
  it('should record usage', () => {
    const result = contractCall('usage-tracking', 'record-usage', 1, 'digital-distribution', 1000);
    
    expect(result.value).toBe(1);
    expect(mockContractCalls['usage-tracking'].lastUsageId).toBe(1);
    
    const usageRecord = mockContractCalls['usage-tracking']['get-usage-record'](1);
    expect(usageRecord).toBeDefined();
    expect(usageRecord['license-id']).toBe(1);
    expect(usageRecord['usage-type']).toBe('digital-distribution');
    expect(usageRecord['usage-amount']).toBe(1000);
    expect(usageRecord.verified).toBe(false);
    
    const licenseUsage = mockContractCalls['usage-tracking']['get-license-usage-records'](1);
    expect(licenseUsage['usage-ids']).toContain(1);
    
    const licenseeUsage = mockContractCalls['usage-tracking']['get-licensee-usage-records']('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    expect(licenseeUsage['usage-ids']).toContain(1);
  });
  
  it('should verify usage', () => {
    contractCall('usage-tracking', 'record-usage', 1, 'digital-distribution', 1000);
    
    const result = contractCall('usage-tracking', 'verify-usage', 1);
    
    expect(result.value).toBe(true);
    
    const usageRecord = mockContractCalls['usage-tracking']['get-usage-record'](1);
    expect(usageRecord.verified).toBe(true);
  });
  
  it('should not verify usage if caller is not the licensor', () => {
    contractCall('usage-tracking', 'record-usage', 1, 'digital-distribution', 1000);
    
    // Override the sender for this test
    const unauthorizedSender = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';
    
    // Mock the contract call with the unauthorized sender
    const result = mockContractCalls['usage-tracking']['verify-usage'](unauthorizedSender, 1);
    
    expect(result.error).toBe(403);
    
    const usageRecord = mockContractCalls['usage-tracking']['get-usage-record'](1);
    expect(usageRecord.verified).toBe(false);
  });
});
