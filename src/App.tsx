import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/Toaster'
import { FullScreenLoader, RequireAuth, RequirePermission, RoleHomeRedirect } from '@/app/guards'
import { useAuthStore } from '@/store/useAuthStore'

import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { POSPage } from '@/features/pos/POSPage'
import { OrdersPage } from '@/features/orders/OrdersPage'
import { TablesPage } from '@/features/tables/TablesPage'
import { TodaySalesPage } from '@/features/reports/TodaySalesPage'
import { DailyRecapPage } from '@/features/reports/DailyRecapPage'
import { TargetsPage } from '@/features/targets/TargetsPage'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { CategoriesPage } from '@/features/products/CategoriesPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { StockMovementPage } from '@/features/inventory/StockMovementPage'
import { StockAdjustmentPage } from '@/features/inventory/StockAdjustmentPage'
import { StockOpnamePage } from '@/features/inventory/StockOpnamePage'
import { UsersPage } from '@/features/users/UsersPage'
import { RolesPage } from '@/features/users/RolesPage'
import { AuditPage } from '@/features/users/AuditPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/features/misc/NotFoundPage'

/**
 * Landing publik dimuat terpisah agar GSAP + Swiper tidak ikut membebani
 * bundel aplikasi kasir yang dipakai setiap hari.
 */
const LandingPage = lazy(() => import('@/features/landing/LandingPage'))

/** `/` menampilkan landing untuk tamu, dan langsung meneruskan yang sudah masuk. */
function PublicHome() {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  if (!hydrated) return <FullScreenLoader />
  if (user) return <RoleHomeRedirect />
  return (
    <Suspense fallback={<FullScreenLoader message="Menyiapkan halaman…" />}>
      <LandingPage />
    </Suspense>
  )
}

export function App() {
  const hydrate = useAuthStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Operasional */}
          <Route
            path="/pos"
            element={
              <RequirePermission permission="pos.access">
                <POSPage />
              </RequirePermission>
            }
          />
          <Route
            path="/tables"
            element={
              <RequirePermission permission="table.manage">
                <TablesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/orders"
            element={
              <RequirePermission permission={['order.view.own', 'order.view.all']}>
                <OrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="/daily-recap"
            element={
              <RequirePermission permission={['report.view.today', 'report.view.full']}>
                <DailyRecapPage />
              </RequirePermission>
            }
          />
          <Route
            path="/today-sales"
            element={
              <RequirePermission permission={['report.view.today', 'report.view.full']}>
                <TodaySalesPage />
              </RequirePermission>
            }
          />

          {/* Target & KPI */}
          <Route
            path="/targets"
            element={
              <RequirePermission permission="target.manage">
                <TargetsPage />
              </RequirePermission>
            }
          />

          {/* Analitik & laporan */}
          <Route
            path="/analytics"
            element={
              <RequirePermission permission="analytics.view">
                <AnalyticsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/reports"
            element={
              <RequirePermission permission="report.view.full">
                <ReportsPage />
              </RequirePermission>
            }
          />

          {/* Katalog */}
          <Route
            path="/products"
            element={
              <RequirePermission permission="product.manage">
                <ProductsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/products-view"
            element={
              <RequirePermission permission="product.view">
                <ProductsPage readOnly />
              </RequirePermission>
            }
          />
          <Route
            path="/categories"
            element={
              <RequirePermission permission="category.manage">
                <CategoriesPage />
              </RequirePermission>
            }
          />

          {/* Inventori */}
          <Route
            path="/inventory"
            element={
              <RequirePermission permission="inventory.view">
                <InventoryPage />
              </RequirePermission>
            }
          />
          <Route
            path="/stock-movement"
            element={
              <RequirePermission permission="inventory.view">
                <StockMovementPage />
              </RequirePermission>
            }
          />
          <Route
            path="/stock-adjustment"
            element={
              <RequirePermission permission="inventory.adjust">
                <StockAdjustmentPage />
              </RequirePermission>
            }
          />
          <Route
            path="/stock-opname"
            element={
              <RequirePermission permission="inventory.opname">
                <StockOpnamePage />
              </RequirePermission>
            }
          />

          {/* Administrasi */}
          <Route
            path="/users"
            element={
              <RequirePermission permission="user.manage">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="/roles"
            element={
              <RequirePermission permission="role.manage">
                <RolesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/audit"
            element={
              <RequirePermission permission="audit.view">
                <AuditPage />
              </RequirePermission>
            }
          />
          <Route
            path="/settings"
            element={
              <RequirePermission permission="settings.manage">
                <SettingsPage />
              </RequirePermission>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </BrowserRouter>
  )
}
