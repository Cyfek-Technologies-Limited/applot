import { uploadResume } from '@/app/actions/profile'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Multipart uploads use the browser's same-origin session cookie.
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, message: 'Refresh the page and try again.' }, { status: 403 })
  }
  try {
    const session = await getSession()
    if (!session?.user) {
      return Response.json({ ok: false, message: 'Sign in again to upload your CV.' }, { status: 401 })
    }
    const length = Number(request.headers.get('content-length'))
    if (length > 5 * 1024 * 1024) {
      return Response.json({ ok: false, message: 'File must be under 4MB.' }, { status: 413 })
    }
    const formData = await request.formData()
    const result = await uploadResume(null, formData)
    return Response.json(result, { status: result?.ok ? 200 : 400 })
  } catch (error) {
    console.error('[applot] CV upload failed', error)
    return Response.json({ ok: false, message: 'Your CV could not be uploaded. Please try again.' }, { status: 500 })
  }
}
