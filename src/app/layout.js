import './globals.css'
import NavBar from '@/components/NavBar'
import Web3Provider from '@/components/Web3Provider'

export const metadata = {
  title: 'Quantum Wallet | Next-Gen Crypto Storage',
  description: 'The most secure, quantum-resistant wallet for your digital assets.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <NavBar />
          <main className="container" style={{ padding: '2rem 1rem', flex: 1 }}>
            {children}
          </main>
          <footer style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--surface-border)',
            marginTop: 'auto'
          }}>
            <p>© {new Date().getFullYear()} Quantum Wallet. All rights reserved.</p>
          </footer>
        </Web3Provider>
      </body>
    </html>
  )
}
