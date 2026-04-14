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

    // Role-based access control
    const roles = user.app_metadata?.roles || []
    
    if (pathname.startsWith('/dashboard/admin') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    if (pathname.startsWith('/dashboard/manager') && !roles.includes('manager') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    if (pathname.startsWith('/dashboard/supervisor') && !roles.includes('supervisor') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard/employee') && roles.length === 0) {
       // Just a fallback, usually everyone has at least 'employee' or 'pending'
    }
  }

  return supabaseResponse
}
