import Link from 'next/link'

interface HeaderProps {
  backUrl?: string
  title: string
  user?: {
    email?: string | null
  }
  actions?: React.ReactNode
}

export function Header({ backUrl, title, user, actions }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {backUrl ? (
              <>
                <Link href={backUrl} className="text-gray-900 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="ml-4 text-xl font-semibold text-gray-900">{title}</h1>
              </>
            ) : (
              <Link href="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
                {title}
              </Link>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {actions}
            {user?.email && (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                <form action="/auth/signout" method="post">
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Sign out
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}