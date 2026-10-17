'use client'

import { useActionState } from 'react'
import { saveProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Defaults = {
  fullName: string
  email: string
  phone: string
  location: string
  headline: string
  summary: string
  linkedinUrl: string
  portfolioUrl: string
  yearsExperience: number
  workAuthorization: string
  salaryExpectation: string
  noticePeriod: string
  skills: string
  targetRoles: string
  preferredLocations: string
  remoteOnly: boolean
  requiresSponsorship: boolean
  willingToRelocate: boolean
  autopilot: boolean
  dailyLimit: number
}

function Field({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} className="h-10" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

function Check({ id, label, defaultChecked }: { id: string; label: string; defaultChecked: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 text-sm">
      <input id={id} name={id} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-primary" />
      {label}
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
      <legend className="sr-only">{title}</legend>
      <h2 aria-hidden="true" className="font-display text-xl font-semibold">
        {title}
      </h2>
      {children}
    </fieldset>
  )
}

export function ProfileForm({ defaults: d }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(saveProfile, null)

  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="What you're looking for">
        <Field
          id="targetRoles"
          label="Target roles"
          required
          defaultValue={d.targetRoles}
          placeholder="Frontend Engineer, React Developer"
          hint="Comma separated. The agent searches for each one."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            id="preferredLocations"
            label="Preferred locations"
            defaultValue={d.preferredLocations}
            placeholder="London, Berlin"
            hint="Ignored when remote only is on."
          />
          <Field
            id="dailyLimit"
            label="Daily application limit"
            type="number"
            min={1}
            max={100}
            defaultValue={d.dailyLimit}
            hint="Between 1 and 100 per day."
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Check id="remoteOnly" label="Remote roles only" defaultChecked={d.remoteOnly} />
          <Check id="autopilot" label="Autopilot: run the agent daily" defaultChecked={d.autopilot} />
        </div>
      </Group>

      <Group title="Contact details">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="fullName" label="Full name" required defaultValue={d.fullName} autoComplete="name" />
          <Field id="email" label="Email for recruiter replies" type="email" required defaultValue={d.email} autoComplete="email" />
          <Field id="phone" label="Phone" type="tel" defaultValue={d.phone} autoComplete="tel" />
          <Field id="location" label="Current location" defaultValue={d.location} placeholder="Lagos, Nigeria" />
          <Field id="linkedinUrl" label="LinkedIn URL" defaultValue={d.linkedinUrl} placeholder="https://linkedin.com/in/" />
          <Field id="portfolioUrl" label="Portfolio or GitHub" defaultValue={d.portfolioUrl} placeholder="https://" />
        </div>
      </Group>

      <Group title="Experience">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="headline" label="Headline" defaultValue={d.headline} placeholder="Senior frontend engineer" />
          <Field id="yearsExperience" label="Years of experience" type="number" min={0} max={60} defaultValue={d.yearsExperience} />
        </div>
        <Field id="skills" label="Key skills" defaultValue={d.skills} placeholder="React, TypeScript, Node.js" hint="Comma separated." />
        <div className="flex flex-col gap-2">
          <Label htmlFor="summary">Professional summary</Label>
          <Textarea id="summary" name="summary" rows={4} defaultValue={d.summary} />
        </div>
      </Group>

      <Group title="Common application questions">
        <div className="grid gap-5 md:grid-cols-3">
          <Field id="workAuthorization" label="Work authorization" defaultValue={d.workAuthorization} placeholder="EU citizen" />
          <Field id="salaryExpectation" label="Salary expectation" defaultValue={d.salaryExpectation} placeholder="$90k" />
          <Field id="noticePeriod" label="Notice period" defaultValue={d.noticePeriod} placeholder="2 weeks" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Check id="requiresSponsorship" label="I require visa sponsorship" defaultChecked={d.requiresSponsorship} />
          <Check id="willingToRelocate" label="I'm willing to relocate" defaultChecked={d.willingToRelocate} />
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} className="h-11 rounded-full px-8">
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
        {state && (
          <p role="status" className={state.ok ? 'text-sm text-primary' : 'text-sm text-destructive'}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
