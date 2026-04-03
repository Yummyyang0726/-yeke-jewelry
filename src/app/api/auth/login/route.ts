import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()

  if (!phone || !password) {
    return Response.json({ error: '手机号和密码不能为空' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { phone } })
  if (!user) {
    return Response.json({ error: '账号或密码错误' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return Response.json({ error: '账号或密码错误' }, { status: 401 })
  }

  await setSession({
    userId: user.id,
    role: user.role as 'boss' | 'employee' | 'factory',
    factoryId: user.factoryId,
    name: user.name,
  })

  return Response.json({
    user: { id: user.id, name: user.name, role: user.role, factoryId: user.factoryId },
  })
}
