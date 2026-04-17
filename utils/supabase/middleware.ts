import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, we just return the response
    // The AuthProvider in the client will handle showing the configuration error UI
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes
  if (pathname === '/' || pathname === '/register') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Protected routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Super Admin Fallback: bernardo.real@latam.com bypasses all role checks
    if (user.email === 'bernardo.real@latam.com') {
      return supabaseResponse
    }

    // Role-based access control (RBAC) - Strict URL protection
    const roles: string[] = user.app_metadata?.roles || []
    
    // Admin has full access
    if (roles.includes('admin') || user.email === 'bernardo.real@latam.com') {
      return supabaseResponse
    }

    // Manager strict access
    if (pathname.startsWith('/dashboard/manager') && !roles.includes('manager')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Coordinator strict access
    if (pathname.startsWith('/dashboard/coordinator') && !roles.includes('coordinator')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Supervisor strict access
    if (pathname.startsWith('/dashboard/supervisor') && !roles.includes('supervisor')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin-only paths should already be covered above but just for safety
    if (pathname.startsWith('/dashboard/admin') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Employee strict access (only if not an admin/manager/coordinator/supervisor)
    if (pathname.startsWith('/dashboard/employee') && !roles.includes('employee')) {
       // If they don't have the employee role, it's safer to redirect them to the generic dashboard
       // which will then send them to their own authorized home
       return NextResponse.redirect(new URL('/dashboard', request.url))
    }

  }

  return supabaseResponse
}
