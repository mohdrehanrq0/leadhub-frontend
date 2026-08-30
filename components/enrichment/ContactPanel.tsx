/**
 * How to actually reach the person: every address found, what verification
 * said about each, plus phone and location.
 *
 * `phone` and `location` were returned by the API and never rendered, and the
 * catch-all / disposable flags that decide whether an address is safe to send
 * to were not returned at all.
 */

import { IconAddressBook, IconMail, IconMapPin, IconPhone } from '@tabler/icons-react';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import { Chip, EmptyNote, EnrichmentSection, FactRow, type ChipTone } from './primitives';

export interface ContactView {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  otherEmails?: string[] | null;
  role?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  emailVerificationStatus?: string | null;
  emailVerifiedAt?: string | null;
  isCatchAll?: boolean | null;
  isDisposable?: boolean | null;
}

const STATUS_TONE: Record<string, ChipTone> = {
  valid: 'emerald',
  catch_all: 'amber',
  unknown: 'slate',
  invalid: 'rose',
  disposable: 'rose',
  blocked: 'rose',
};

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function ContactPanel({
  contact,
  id = 'contact',
}: {
  contact?: ContactView | null;
  id?: string;
}) {
  if (!contact) {
    return (
      <EnrichmentSection id={id} title="Contact" icon={<IconAddressBook size={16} />}>
        <EmptyNote>No contact details yet.</EmptyNote>
      </EnrichmentSection>
    );
  }

  const status = contact.emailVerificationStatus ?? undefined;
  // The primary is listed separately, so filtering it out of the extras keeps
  // the same address from appearing twice.
  const others = (contact.otherEmails ?? []).filter((email) => email && email !== contact.email);
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();

  return (
    <EnrichmentSection
      id={id}
      title="Contact"
      icon={<IconAddressBook size={16} />}
      subtitle={contact.role ?? undefined}
      actions={contact.linkedinUrl ? <LinkedInLink url={contact.linkedinUrl} compact /> : undefined}
    >
      <div className="space-y-4">
        <dl className="space-y-3">
          <FactRow label="Name">{name || undefined}</FactRow>
          <FactRow label="Title">{contact.role}</FactRow>
          <FactRow label="Location">
            {contact.location ? (
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin size={13} className="text-slate-400" />
                {contact.location}
              </span>
            ) : undefined}
          </FactRow>
          <FactRow label="Phone">
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
              >
                <IconPhone size={13} />
                {contact.phone}
              </a>
            ) : undefined}
          </FactRow>
        </dl>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</p>
          {contact.email ? (
            <div className="mt-1.5 space-y-1.5">
              <EmailRow
                email={contact.email}
                status={status}
                isCatchAll={contact.isCatchAll}
                isDisposable={contact.isDisposable}
                primary
              />
              {others.map((email) => (
                <EmailRow key={email} email={email} />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No address found yet.</p>
          )}
        </div>
      </div>
    </EnrichmentSection>
  );
}

function EmailRow({
  email,
  status,
  isCatchAll,
  isDisposable,
  primary,
}: {
  email: string;
  status?: string;
  isCatchAll?: boolean | null;
  isDisposable?: boolean | null;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <IconMail size={13} className="shrink-0 text-slate-400" />
      <a href={`mailto:${email}`} className="text-sm font-medium text-slate-800 hover:underline">
        {email}
      </a>
      {primary ? <Chip tone="blue">Primary</Chip> : null}
      {status ? <Chip tone={STATUS_TONE[status] ?? 'slate'}>{statusLabel(status)}</Chip> : null}
      {isCatchAll ? (
        <Chip tone="amber" title="The domain accepts all addresses, so delivery is not proof this mailbox exists.">
          Catch-all
        </Chip>
      ) : null}
      {isDisposable ? (
        <Chip tone="rose" title="Throwaway address provider.">
          Disposable
        </Chip>
      ) : null}
    </div>
  );
}
