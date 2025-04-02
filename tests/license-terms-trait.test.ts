import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract calls
const mockContractCalls = {
  'ip-registration': {
    'get-ip': (id) => {
      if (id === 1) {
        return {
          owner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          title: 'Test Patent',
          description: 'A test patent description',
          'ip-type': 'patent',
          'creation-date': Date.now(),
          'registration-date': Date.now()
        };
      }
      return null;
    }
  },
  'license-terms': {
    lastLicenseId: 0,
    licenses: new Map(),
    ipLicenses: new Map(),
    licenseeAgreements: new Map(),
    
    'get-license': (id) => {
      return mockContractCalls['license-terms'].licenses.get(id) || null;
    },
    
    'get-ip-licenses': (ipId) => {
      return mockContractCalls['license-terms'].ipLicenses.get(ipId) || { 'license-ids': [] };
    },
    
    'get-licensee-agreement': (licensee, licenseId) => {
      const key = `${licensee}-${licenseId}`;
      return mockContractCalls['license-terms'].licenseeAgreements.get(key) || null;
    },
    
    'create-license': (sender, ipId, licenseType, usageRights, royaltyPercentage, duration) => {
      // Check if IP exists and caller is the owner
      const ip = mockContractCalls['ip-registration']['get-ip'](ipId);
      if (!ip) return { error: 404 };
      if (ip.owner !== sender) return { error: 403 };
      if (royaltyPercentage > 10000) return { error: 400 };
      
      const newId = mockContractCalls['license-terms'].lastLicenseId + 1;
      const currentTime = Date.now();
      
      mockContractCalls['license-terms'].licenses.set(newId, {
        'ip-id': ipId,
        licensor: sender,
        'license-type': licenseType,
        'usage-rights': usageRights,
        'royalty-percentage': royaltyPercentage,
        duration: duration,
        'created-at': currentTime,
        active: true
      });
      
      const ipCurrentLicenses = mockContractCalls['license-terms'].ipLicenses.get(ipId) || { 'license-ids': [] };
      ipCurrentLicenses['license-ids'].push(newId);
      mockContractCalls['license-terms'].ipLicenses.set(ipId, ipCurrentLicenses);
      
      mockContractCalls['license-terms'].lastLicenseId = newId;
      return { value: newId };
    },
    
    'accept-license': (sender, licenseId) => {
      const license = mockContractCalls['license-terms'].licenses.get(licenseId);
      if (!license) return { error: 404 };
      if (!license.active) return { error: 403 };
      
      const currentTime = Date.now();
      const expiration = currentTime + license.duration;
      
      const key = `${sender}-${licenseId}`;
      mockContractCalls['license-terms'].licenseeAgreements.set(key, {
        accepted: true,
        'accepted-at': currentTime,
        'expires-at': expiration,
        active: true
      });
      
      return { value: true };
    },
    
    'deactivate-license': (sender, licenseId) => {
      const license = mockContractCalls['license-terms'].licenses.get(licenseId);
      if (!license) return { error: 404 };
      if (license.licensor !== sender) return { error: 403 };
      
      license.active = false;
      mockContractCalls['license-terms'].licenses.set(licenseId, license);
      
      return { value: true };
    }
  }
};

// Mock the contract-call function
const contractCall = (contract, method, ...args) => {
  const sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Default test sender
  return mockContractCalls[contract][method](sender, ...args);
};

describe('License Terms Contract', () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractCalls['license-terms'].lastLicenseId = 0;
    mockContractCalls['license-terms'].licenses = new Map();
    mockContractCalls['license-terms'].ipLicenses = new Map();
    mockContractCalls['license-terms'].licenseeAgreements = new Map();
  });
  
  it('should create a new license', () => {
    const result = contractCall('license-terms', 'create-license', 1, 'commercial', 'Full usage rights for commercial purposes', 1000, 31536000); // 1 year in seconds
    
    expect(result.value).toBe(1);
    expect(mockContractCalls['license-terms'].lastLicenseId).toBe(1);
    
    const license = mockContractCalls['license-terms']['get-license'](1);
    expect(license).toBeDefined();
    expect(license['ip-id']).toBe(1);
    expect(license['license-type']).toBe('commercial');
    expect(license['usage-rights']).toBe('Full usage rights for commercial purposes');
    expect(license['royalty-percentage']).toBe(1000);
    expect(license.active).toBe(true);
    
    const ipLicenses = mockContractCalls['license-terms']['get-ip-licenses'](1);
    expect(ipLicenses['license-ids']).toContain(1);
  });
  
  it('should accept a license', () => {
    contractCall('license-terms', 'create-license', 1, 'commercial', 'Full usage rights for commercial purposes', 1000, 31536000);
    
    const result = contractCall('license-terms', 'accept-license', 1);
    
    expect(result.value).toBe(true);
    
    const agreement = mockContractCalls['license-terms']['get-licensee-agreement']('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1);
    expect(agreement).toBeDefined();
    expect(agreement.accepted).toBe(true);
    expect(agreement.active).toBe(true);
  });
  
  it('should deactivate a license', () => {
    contractCall('license-terms', 'create-license', 1, 'commercial', 'Full usage rights for commercial purposes', 1000, 31536000);
    
    const result = contractCall('license-terms', 'deactivate-license', 1);
    
    expect(result.value).toBe(true);
    
    const license = mockContractCalls['license-terms']['get-license'](1);
    expect(license.active).toBe(false);
  });
  
  it('should not create a license if caller is not the IP owner', () => {
    // Override the sender for this test
    const unauthorizedSender = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';
    
    // Mock the contract call with the unauthorized sender
    const result = mockContractCalls['license-terms']['create-license'](
        unauthorizedSender,
        1,
        'commercial',
        'Full usage rights for commercial purposes',
        1000,
        31536000
    );
    
    expect(result.error).toBe(403);
  });
});
