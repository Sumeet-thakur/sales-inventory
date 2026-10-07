
const Index = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-full">
      <div className="space-y-6">
        <div className="text-left">
          <h1 className="text-2xl md:text-4xl font-bold mb-4">Welcome to Inventory System</h1>
          <p className="text-lg text-gray-600">
            Manage your inventory, sales, and purchases efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Total Sales</h3>
            <p className="text-3xl font-bold text-primary">$0.00</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Total Purchases</h3>
            <p className="text-3xl font-bold text-primary">$0.00</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Total Items</h3>
            <p className="text-3xl font-bold text-primary">0</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-gray-600 text-center">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
