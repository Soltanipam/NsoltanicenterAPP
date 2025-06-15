import { useState, useEffect, FormEvent } from 'react';
import { PlusCircle, Search, Edit, Trash2, X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useCustomerStore } from '../../store/customerStore';
import { persianToEnglish } from '../../utils/numberUtils';

const CustomerManagement = () => {
  const { customers, loadCustomers, addCustomer, updateCustomer, deleteCustomer, isLoading, error, clearError } = useCustomerStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    can_login: true
  });

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);
  
  const filteredCustomers = customers.filter(customer => 
    (customer.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (customer.mobile || '').includes(searchQuery) ||
    (customer.customer_code || '').includes(searchQuery)
  );
  
  const handleEdit = (customer: any) => {
    if (user?.role !== 'admin') {
      toast.error('فقط مدیر سیستم می‌تواند اطلاعات مشتری را ویرایش کند');
      return;
    }
    
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || '',
      can_login: customer.can_login
    });
    setShowModal(true);
  };
  
  const handleDelete = async (customerId: string) => {
    if (user?.role !== 'admin') {
      toast.error('فقط مدیر سیستم می‌تواند مشتری را حذف کند');
      return;
    }
    
    setIsDeleting(customerId);
    try {
      await deleteCustomer(customerId);
      toast.success('مشتری با موفقیت حذف شد');
    } catch (error) {
      toast.error('خطا در حذف مشتری');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.mobile) {
      toast.error('لطفاً نام و شماره موبایل را وارد کنید');
      return;
    }

    try {
      const mobileNumber = persianToEnglish(formData.mobile);
      
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: formData.name,
          mobile: mobileNumber,
          email: formData.email,
          can_login: formData.can_login
        });
        toast.success('اطلاعات مشتری با موفقیت ویرایش شد');
      } else {
        await addCustomer({
          name: formData.name,
          mobile: mobileNumber,
          email: formData.email,
          can_login: formData.can_login
        });
        toast.success('مشتری جدید با موفقیت ثبت شد');
      }
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', mobile: '', email: '', can_login: true });
    } catch (error) {
      toast.error('خطا در ذخیره اطلاعات مشتری');
    }
  };
  
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">مدیریت مشتریان</h1>
          <p className="text-gray-600 dark:text-gray-400">مدیریت اطلاعات مشتریان سیستم</p>
        </div>
        
        {user?.role === 'admin' && (
          <Button
            variant="primary"
            leftIcon={<PlusCircle size={16} />}
            onClick={() => {
              setEditingCustomer(null);
              setFormData({ name: '', mobile: '', email: '', can_login: true });
              setShowModal(true);
            }}
            disabled={isLoading}
          >
            مشتری جدید
          </Button>
        )}
      </div>
      
      <Card className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pr-10 w-full"
            placeholder="جستجوی مشتری..."
          />
        </div>
      </Card>
      
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                کد مشتری
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                نام
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                شماره موبایل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                ایمیل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                دسترسی ورود
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                تاریخ ثبت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                عملیات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  در حال بارگذاری...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  مشتری‌ای یافت نشد
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {customer.customer_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{customer.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm ltr">
                    {customer.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {customer.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {customer.can_login ? (
                        <div className="flex items-center text-green-600">
                          <ToggleRight size={20} />
                          <span className="mr-1 text-sm">فعال</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <ToggleLeft size={20} />
                          <span className="mr-1 text-sm">غیرفعال</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {customer.created_at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end space-x-reverse space-x-2">
                      {user?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            disabled={isDeleting === customer.id}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 disabled:opacity-50"
                          >
                            {isDeleting === customer.id ? (
                              <span className="animate-spin">⚪</span>
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCustomer(null);
                }}
                className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold mb-6">
                {editingCustomer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
              </h2>
              
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    نام
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    شماره موبایل
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: persianToEnglish(e.target.value) })}
                    className="input"
                    required
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ایمیل (اختیاری)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="can_login"
                    checked={formData.can_login}
                    onChange={(e) => setFormData({ ...formData, can_login: e.target.checked })}
                    className="h-4 w-4 text-accent focus:ring-accent"
                  />
                  <label htmlFor="can_login" className="mr-2 text-sm font-medium">
                    دسترسی ورود به سیستم آنلاین
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCustomer(null);
                    }}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                  >
                    {editingCustomer ? 'به‌روزرسانی' : 'ایجاد مشتری'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;