import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { CO_ADMIN_CAP, type AdminRoleAction } from '@/lib/lodge-admin-roles'
import { requirePrimaryLodgeAdmin } from '@/lib/lodge-admin'

const ACTIONS: AdminRoleAction[] = ['promote_co_admin', 'demote_co_admin', 'transfer_primary']

async function countCoAdmins(
  admin: ReturnType<typeof createAdminClient>,
  lodgeId: string
): Promise<number> {
  const { count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('lodge_id', lodgeId)
    .eq('is_co_admin', true)
  return count ?? 0
}

export async function POST(request: Request) {
  const body = await request.json()
  const memberId = body.memberId as string | undefined
  const action = body.action as AdminRoleAction | undefined
  const keepAsCoAdmin = body.keepAsCoAdmin === true

  if (!memberId || !action || !ACTIONS.includes(action)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: actorProfile } = await admin
    .from('profiles')
    .select('lodge_id, is_lodge_admin, is_co_admin')
    .eq('id', user.id)
    .single()

  if (
    !actorProfile?.lodge_id ||
    (!actorProfile.is_lodge_admin && !actorProfile.is_co_admin)
  ) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: target } = await admin
    .from('profiles')
    .select('id, lodge_id, verification_status, is_lodge_admin, is_co_admin')
    .eq('id', memberId)
    .single()

  if (!target || target.lodge_id !== actorProfile.lodge_id) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }

  if (action === 'demote_co_admin') {
    const isSelf = target.id === user.id
    if (!isSelf && !actorProfile.is_lodge_admin) {
      return Response.json({ error: 'NOT_PRIMARY', message: 'Only the primary admin can remove co-admins.' }, { status: 403 })
    }
    if (!target.is_co_admin || target.is_lodge_admin) {
      return Response.json({ error: 'NOT_CO_ADMIN', message: 'This member is not a co-admin.' }, { status: 400 })
    }

    const { error } = await admin
      .from('profiles')
      .update({ is_co_admin: false })
      .eq('id', memberId)

    if (error) {
      console.error('Demote co-admin error:', error)
      return Response.json({ error: 'Update failed' }, { status: 500 })
    }

    return Response.json({
      success: true,
      action,
      demotedSelf: isSelf,
    })
  }

  const primaryGate = await requirePrimaryLodgeAdmin()
  if ('error' in primaryGate) return primaryGate.error

  if (action === 'promote_co_admin') {
    if (target.id === user.id) {
      return Response.json({ error: 'Cannot modify your own role here.' }, { status: 400 })
    }
    if (target.is_lodge_admin || target.is_co_admin) {
      return Response.json({ error: 'ALREADY_ADMIN', message: 'This member is already an admin.' }, { status: 400 })
    }
    if (target.verification_status !== 'verified') {
      return Response.json({
        error: 'NOT_VERIFIED',
        message: 'Only verified members can be made co-admin.',
      }, { status: 400 })
    }

    const coAdminCount = await countCoAdmins(admin, actorProfile.lodge_id)
    if (coAdminCount >= CO_ADMIN_CAP) {
      return Response.json({
        error: 'CO_ADMIN_CAP',
        message: `Your lodge already has ${CO_ADMIN_CAP} co-admins. Remove one before adding another.`,
      }, { status: 400 })
    }

    const { error } = await admin
      .from('profiles')
      .update({ is_co_admin: true })
      .eq('id', memberId)

    if (error) {
      console.error('Promote co-admin error:', error)
      return Response.json({ error: 'Update failed' }, { status: 500 })
    }

    return Response.json({ success: true, action })
  }

  if (action === 'transfer_primary') {
    if (target.id === user.id) {
      return Response.json({ error: 'CANNOT_TRANSFER_TO_SELF', message: 'Choose another member to transfer to.' }, { status: 400 })
    }
    if (target.is_lodge_admin) {
      return Response.json({ error: 'ALREADY_PRIMARY', message: 'This member is already the primary admin.' }, { status: 400 })
    }
    if (target.verification_status !== 'verified') {
      return Response.json({
        error: 'NOT_VERIFIED',
        message: 'Only verified members can become primary admin. Approve them first.',
      }, { status: 400 })
    }

    let projectedCoAdmins = await countCoAdmins(admin, actorProfile.lodge_id)
    if (target.is_co_admin) projectedCoAdmins -= 1
    if (keepAsCoAdmin) projectedCoAdmins += 1

    if (projectedCoAdmins > CO_ADMIN_CAP) {
      return Response.json({
        error: 'CO_ADMIN_CAP',
        message: `Transfer would exceed the ${CO_ADMIN_CAP} co-admin limit. Remove a co-admin first.`,
      }, { status: 400 })
    }

    const { error: targetError } = await admin
      .from('profiles')
      .update({ is_lodge_admin: true, is_co_admin: false })
      .eq('id', memberId)

    if (targetError) {
      console.error('Transfer primary (target) error:', targetError)
      return Response.json({ error: 'Update failed' }, { status: 500 })
    }

    const { error: actorError } = await admin
      .from('profiles')
      .update({ is_lodge_admin: false, is_co_admin: keepAsCoAdmin })
      .eq('id', user.id)

    if (actorError) {
      console.error('Transfer primary (actor) error:', actorError)
      await admin
        .from('profiles')
        .update({
          is_lodge_admin: target.is_lodge_admin,
          is_co_admin: target.is_co_admin,
        })
        .eq('id', memberId)
      return Response.json({ error: 'Update failed' }, { status: 500 })
    }

    const { error: lodgeError } = await admin
      .from('lodges')
      .update({ claim_code_claimed_by: memberId })
      .eq('id', actorProfile.lodge_id)

    if (lodgeError) {
      console.error('Transfer primary (lodge) error:', lodgeError)
    }

    return Response.json({
      success: true,
      action,
      transferredTo: memberId,
      keepAsCoAdmin,
    })
  }

  return Response.json({ error: 'Invalid request' }, { status: 400 })
}
