import { filterIdentities } from './filterIdentities';

describe('modules identity - service - filterIdentities', () => {
  const identities = [
    { identity_id: 'foo', type: 'local', protocol: 'email' },
    { identity_id: 'bar', type: 'remote', protocol: 'twitter' },
    { identity_id: 'baz', type: 'remote', protocol: 'email' },
  ];

  const contacts = [
    { contact_id: 'contact-user', emails: [{ address: 'me@caliopen.local' }] },
    { contact_id: 'contact-with-all-protocols', emails: [{ address: 'foo@bar.tld' }], identities: [{ name: 'foo', type: 'twitter' }] },
    { contact_id: 'contact-with-email-protocol', emails: [{ address: 'foo2@bar2.tld' }] },
  ];

  const user = {
    contact: {
      contact_id: 'contact-user',
    },
  };

  it('list all when no parent', () => {
    expect(filterIdentities({ identities, contacts, user })).toEqual(identities);
  });

  it('filter parent message protocol (email) (1-to-n no contacts)', () => {
    const parentMessage = {
      type: 'email',
      participants: [
        { address: 'foo@contact.tld', protocol: 'email' },
        { address: 'foo2@contact.tld', protocol: 'email' },
        { address: 'me@caliopen.local', protocol: 'email', contact_ids: ['contact-user'] },
      ],
    };

    expect(filterIdentities({ identities, parentMessage, contacts, user })).toEqual([identities[0], identities[2]]);
  });

  it('filter parent message protocol (twitter) (1-to-n)', () => {
    const parentMessage = {
      type: 'DM twitter',
      participants: [
        { address: '@contact', protocol: 'twitter' },
        { address: '@contact2', protocol: 'twitter' },
        { address: '@me', protocol: 'twitter', contact_ids: ['contact-user'] },
      ],
    };

    expect(filterIdentities({ identities, parentMessage, contacts, user })).toEqual([identities[1]]);
  });

  it('filter discussion 1-to-1 available contact address', () => {
    const parentMessage = {
      type: 'DM twitter',
      participants: [
        { address: '@contact', protocol: 'twitter', contact_ids: ['contact-with-all-protocols'] },
        { address: '@me', protocol: 'twitter', contact_ids: ['contact-user'] },
      ],
    };

    expect(filterIdentities({ identities, parentMessage, contacts, user })).toEqual(identities);
  });

  it('filter discussion 1-to-1 without contact', () => {
    const parentMessage = {
      type: 'DM twitter',
      participants: [
        { address: '@contact', protocol: 'twitter' },
        { address: '@me', protocol: 'twitter', contact_ids: ['contact-user'] },
      ],
    };

    expect(filterIdentities({ identities, parentMessage, contacts, user })).toEqual([identities[1]]);
  });

  it('filter discussion 1-to-n with contacts', () => {
    const parentMessage = {
      type: 'email',
      participants: [
        { address: 'foo@bar.tld', protocol: 'email', contacts_ids: ['contact-with-all-protocols'] },
        { address: 'foo2@bar2.tld', protocol: 'email', contacts_ids: ['contact-with-email-protocol'] },
        { address: 'me@caliopen.local', protocol: 'email', contact_ids: ['contact-user'] },
      ],
    };

    expect(filterIdentities({ identities, parentMessage, contacts, user })).toEqual([identities[0], identities[2]]);
  });
});