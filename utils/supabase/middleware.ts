import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/security/rate-limiter'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Web Application Firewall (WAF) - Edge Rate Limiting Block
  const routeType = (pathname === '/' || pathname === '/login' || pathname === '/register') ? 'AUTH' : 'STANDARD';
  const { allowed, remaining } = checkRateLimit(request, routeType);
  
  if (!allowed) {
    // Drop connection on rate limit exceeded via standard 429 Too Many Requests response
    // Further logging to the DB could optionally be pushed asynchronously using fetch here if needed
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests', message: 'SGEI Security: Rate Limit Exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

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

  // pathname is already declared at the top of the function for the WAF

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

    // Role-based access control (RBAC) - Strict URL protection
    const roles: string[] = user.app_metadata?.roles || []
    
    // Admin has full access
    if (roles.includes('admin')) {
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
