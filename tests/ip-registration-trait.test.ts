import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract calls
const mockContractCalls = {
  'ip-registration': {
    lastId: 0,
    ipRegistry: new Map(),
    ownerIps: new Map(),
    
    'get-ip': (id) => {
      return mockContractCalls['ip-registration'].ipRegistry.get(id) || null;
    },
    
    'get-owner-ips': (owner) => {
      return mockContractCalls['ip-registration'].ownerIps.get(owner) || { 'ip-ids': [] };
    },
    
    'register-ip': (sender, title, description, ipType) => {
      const newId = mockContractCalls['ip-registration'].lastId + 1;
      const currentTime = Date.now();
      
      mockContractCalls['ip-registration'].ipRegistry.set(newId, {
        owner: sender,
        title,
        description,
        'ip-type': ipType,
        'creation-date': currentTime,
        'registration-date': currentTime
      });
      
      const ownerCurrentIps = mockContractCalls['ip-registration'].ownerIps.get(sender) || { 'ip-ids': [] };
      ownerCurrentIps['ip-ids'].push(newId);
      mockContractCalls['ip-registration'].ownerIps.set(sender, ownerCurrentIps);
      
      mockContractCalls['ip-registration'].lastId = newId;
      return { value: newId };
    },
    
    'transfer-ip': (sender, id, newOwner) => {
      const ip = mockContractCalls['ip-registration'].ipRegistry.get(id);
      if (!ip) return { error: 404 };
      if (ip.owner !== sender) return { error: 403 };
      if (ip.owner === newOwner) return { error: 400 };
      
      // Update IP registry with new owner
      ip.owner = newOwner;
      mockContractCalls['ip-registration'].ipRegistry.set(id, ip);
      
      // Remove ID from current owner's list
      const currentOwnerIps = mockContractCalls['ip-registration'].ownerIps.get(sender);
      currentOwnerIps['ip-ids'] = currentOwnerIps['ip-ids'].filter(item => item !== id);
      mockContractCalls['ip-registration'].ownerIps.set(sender, currentOwnerIps);
      
      // Add ID to new owner's list
      const newOwnerIps = mockContractCalls['ip-registration'].ownerIps.get(newOwner) || { 'ip-ids': [] };
      newOwnerIps['ip-ids'].push(id);
      mockContractCalls['ip-registration'].ownerIps.set(newOwner, newOwnerIps);
      
      return { value: true };
    }
  }
};

// Mock the contract-call function
global.contractCall = (contract, method, ...args) => {
  const sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Default test sender
  return mockContractCalls[contract][method](sender, ...args);
};

describe('IP Registration Contract', () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockContractCalls['ip-registration'].lastId = 0;
    mockContractCalls['ip-registration'].ipRegistry = new Map();
    mockContractCalls['ip-registration'].ownerIps = new Map();
  });
  
  it('should register a new IP', () => {
    const result = contractCall('ip-registration', 'register-ip', 'Test Patent', 'A test patent description', 'patent');
    
    expect(result.value).toBe(1);
    expect(mockContractCalls['ip-registration'].lastId).toBe(1);
    
    const ip = mockContractCalls['ip-registration'].ipRegistry.get(1);
    expect(ip).toBeDefined();
    expect(ip.title).toBe('Test Patent');
    expect(ip.description).toBe('A test patent description');
    expect(ip['ip-type']).toBe('patent');
    
    const ownerIps = mockContractCalls['ip-registration']['get-owner-ips']('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    expect(ownerIps['ip-ids']).toContain(1);
  });
  
  it('should retrieve an IP by ID', () => {
    contractCall('ip-registration', 'register-ip', 'Test Patent', 'A test patent description', 'patent');
    
    const ip = mockContractCalls['ip-registration']['get-ip'](1);
    
    expect(ip).toBeDefined();
    expect(ip.title).toBe('Test Patent');
    expect(ip.description).toBe('A test patent description');
    expect(ip['ip-type']).toBe('patent');
  });
  
  it('should transfer IP ownership', () => {
    contractCall('ip-registration', 'register-ip', 'Test Patent', 'A test patent description', 'patent');
    
    const newOwner = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = contractCall('ip-registration', 'transfer-ip', 1, newOwner);
    
    expect(result.value).toBe(true);
    
    const ip = mockContractCalls['ip-registration']['get-ip'](1);
    expect(ip.owner).toBe(newOwner);
    
    const originalOwnerIps = mockContractCalls['ip-registration']['get-owner-ips']('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    expect(originalOwnerIps['ip-ids']).not.toContain(1);
    
    const newOwnerIps = mockContractCalls['ip-registration']['get-owner-ips'](newOwner);
    expect(newOwnerIps['ip-ids']).toContain(1);
  });
});
