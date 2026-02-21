import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NewListingNotification from './NewListingNotification';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>
      <Footer className="hidden md:block" />
      <BottomNav />
      <NewListingNotification />
    </div>
  );
}
