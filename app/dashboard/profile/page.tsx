import { ProfileForm } from '@/components/dashboard/profile-form'
import { ResumeUpload } from '@/components/dashboard/resume-upload'
import { getSession, requireUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Profile — Applot' }

export default async function ProfilePage() {
  const userId = await requireUserId()
  const [profile, session] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    getSession(),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-medium tracking-tight">Profile & CV</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Fill this in once. The agent reuses these answers on every application, so you never
          type them again.
        </p>
      </div>
      <ResumeUpload fileName={profile?.resumeFileName ?? ''} preview={profile?.resumeText.slice(0, 400) ?? ''} />
      <ProfileForm
        defaults={{
          fullName: profile?.fullName || session?.user.name || '',
          email: profile?.email || session?.user.email || '',
          phone: profile?.phone ?? '',
          location: profile?.location ?? '',
          headline: profile?.headline ?? '',
          summary: profile?.summary ?? '',
          linkedinUrl: profile?.linkedinUrl ?? '',
          portfolioUrl: profile?.portfolioUrl ?? '',
          yearsExperience: profile?.yearsExperience ?? 0,
          workAuthorization: profile?.workAuthorization ?? '',
          salaryExpectation: profile?.salaryExpectation ?? '',
          noticePeriod: profile?.noticePeriod ?? '',
          skills: profile?.skills.join(', ') ?? '',
          targetRoles: profile?.targetRoles.join(', ') ?? '',
          preferredLocations: profile?.preferredLocations.join(', ') ?? '',
          remoteOnly: profile?.remoteOnly ?? true,
          requiresSponsorship: profile?.requiresSponsorship ?? false,
          willingToRelocate: profile?.willingToRelocate ?? false,
          autopilot: profile?.autopilot ?? false,
          dailyLimit: profile?.dailyLimit ?? 25,
        }}
      />
    </div>
  )
}
