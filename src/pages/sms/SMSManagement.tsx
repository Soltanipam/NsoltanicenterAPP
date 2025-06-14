import { useState, useEffect } from 'react';
import { MessageSquare, Send, Settings, Eye, Trash2, Plus, Edit, X, Phone, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useSMSStore, SMSTemplate } from '../../store/smsStore';
import { useReceptionStore } from '../../store/receptionStore';
import { useCustomerStore } from '../../store/customerStore';
import { toast } from 'react-hot-toast';
import { englishToPersian, persianToEnglish } from '../../utils/numberUtils';

const SMSManagement = () => {
  const { settings, logs, updateSettings, addTemplate, updateTemplate, deleteTemplate, sendSMS, getBalance } = useSMSStore();
  const { getActiveReceptions } = useReceptionStore();
  const { customers } = useCustomerStore();
  
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'logs' | 'settings'>('send');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customRecipient, setCustomRecipient] = useState('');
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    variables: [] as string[]
  });

  const activeReceptions = getActiveReceptions();

  useEffect(() => {
    if (settings.enabled) {
      loadBalance();
    }
  }, [settings.enabled]);

  const loadBalance = async () => {
    try {
      const currentBalance = await getBalance();
      setBalance(currentBalance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleSendSMS = async () => {
    if (!settings.enabled) {
      toast.error('سرویس پیامک فعال نیست');
      return;
    }

    if (selectedRecipients.length === 0 && !customRecipient) {
      toast.error('لطفاً حداقل یک گیرنده انتخاب کنید');
      return;
    }

    if (!customMessage && !selectedTemplate) {
      toast.error('لطفاً پیام یا قالب را انتخاب کنید');
      return;
    }

    const recipients = customRecipient ? 
      [customRecipient, ...selectedRecipients] : 
      selectedRecipients;

    const message = selectedTemplate ? 
      settings.templates.find(t => t.id === selectedTemplate)?.content || customMessage :
      customMessage;

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const success = await sendSMS(recipient, message, selectedTemplate);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${englishToPersian(successCount.toString())} پیام با موفقیت ارسال شد`);
    }
    
    if (failCount > 0) {
      toast.error(`${englishToPersian(failCount.toString())} پیام ارسال نشد`);
    }

    // Reset form
    setSelectedRecipients([]);
    setCustomMessage('');
    setSelectedTemplate('');
    setCustomRecipient('');
    
    // Reload balance
    loadBalance();
  };

  const handleTemplateSubmit = () => {
    if (!templateForm.name || !templateForm.content) {
      toast.error('لطفاً نام و متن قالب را وارد کنید');
      return;
    }

    if (editingTemplate) {
      updateTemplate(editingTemplate.id, templateForm);
      toast.success('قالب با موفقیت ویرایش شد');
    } else {
      addTemplate(templateForm);
      toast.success('قالب جدید با موفقیت ایجاد شد');
    }

    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', content: '', variables: [] });
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    toast.success('قالب با موفقیت حذف شد');
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const renderSendTab = () => (
    <div className="space-y-6">
      {/* Balance Display */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold">موجودی حساب</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">موجودی فعلی پنل پیامکی</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-green-600">{englishToPersian(balance.toString())}</p>
            <p className="text-sm text-gray-500">پیام</p>
          </div>
        </div>
      </Card>

      {/* Recipients Selection */}
      <Card>
        <h3 className="font-semibold mb-4">انتخاب گیرندگان</h3>
        
        <div className="space-y-4">
          {/* Custom Recipient */}
          <div>
            <label className="block text-sm font-medium mb-2">شماره تماس دستی</label>
            <input
              type="tel"
              value={customRecipient}
              onChange={(e) => setCustomRecipient(persianToEnglish(e.target.value))}
              className="input"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              dir="ltr"
            />
          </div>

          {/* Active Customers */}
          <div>
            <label className="block text-sm font-medium mb-2">مشتریان فعال</label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
              {activeReceptions.map((reception) => (
                <div key={reception.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`reception-${reception.id}`}
                    checked={selectedRecipients.includes(reception.customerInfo.phone)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRecipients([...selectedRecipients, reception.customerInfo.phone]);
                      } else {
                        setSelectedRecipients(selectedRecipients.filter(p => p !== reception.customerInfo.phone));
                      }
                    }}
                    className="h-4 w-4 text-accent focus:ring-accent"
                  />
                  <label htmlFor={`reception-${reception.id}`} className="mr-2 text-sm">
                    {reception.customerInfo.name} - {reception.customerInfo.phone}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Message Composition */}
      <Card>
        <h3 className="font-semibold mb-4">تنظیم پیام</h3>
        
        <div className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">انتخاب قالب</label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                if (e.target.value) {
                  const template = settings.templates.find(t => t.id === e.target.value);
                  if (template) {
                    setCustomMessage(template.content);
                  }
                }
              }}
              className="input"
            >
              <option value="">انتخاب قالب...</option>
              {settings.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium mb-2">متن پیام</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="input"
              rows={4}
              placeholder="متن پیام خود را وارد کنید..."
            />
            <p className="text-sm text-gray-500 mt-1">
              تعداد کاراکتر: {englishToPersian(customMessage.length.toString())}
            </p>
          </div>

          <Button
            onClick={handleSendSMS}
            variant="primary"
            leftIcon={<Send size={16} />}
            disabled={!settings.enabled}
            className="w-full"
          >
            ارسال پیام
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">مدیریت قالب‌ها</h3>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setTemplateForm({ name: '', content: '', variables: [] });
            setShowTemplateModal(true);
          }}
          variant="primary"
          leftIcon={<Plus size={16} />}
        >
          قالب جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.templates.map((template) => (
          <Card key={template.id}>
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold">{template.name}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                    setTemplateForm({
                      name: template.name,
                      content: template.content,
                      variables: template.variables
                    });
                    setShowTemplateModal(true);
                  }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.content}
            </p>
            {template.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.variables.map((variable) => (
                  <span
                    key={variable}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded"
                  >
                    {`{${variable}}`}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">تاریخچه ارسال</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                گیرنده
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                پیام
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                وضعیت
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                تاریخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                هزینه
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.to}
                </td>
                <td className="px-6 py-4 text-sm max-w-xs truncate">
                  {log.message}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    log.status === 'sent' ? 'bg-green-100 text-green-800' :
                    log.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {log.status === 'sent' ? 'ارسال شده' :
                     log.status === 'failed' ? 'ناموفق' : 'در انتظار'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.sentAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.cost ? `${englishToPersian(log.cost.toString())} تومان` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">تنظیمات پنل پیامکی</h3>
      
      <Card>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sms-enabled"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
              className="h-4 w-4 text-accent focus:ring-accent"
            />
            <label htmlFor="sms-enabled" className="mr-2 text-sm font-medium">
              فعال‌سازی سرویس پیامک
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">نام کاربری پنل</label>
            <input
              type="text"
              value={settings.username}
              onChange={(e) => updateSettings({ username: e.target.value })}
              className="input"
              placeholder="نام کاربری Melipayamak"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">رمز عبور پنل</label>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => updateSettings({ password: e.target.value })}
              className="input"
              placeholder="رمز عبور Melipayamak"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">شماره فرستنده</label>
            <input
              type="text"
              value={settings.from}
              onChange={(e) => updateSettings({ from: persianToEnglish(e.target.value) })}
              className="input"
              placeholder="شماره خط اختصاصی"
              dir="ltr"
            />
          </div>

          <Button
            onClick={() => {
              toast.success('تنظیمات با موفقیت ذخیره شد');
              if (settings.enabled) {
                loadBalance();
              }
            }}
            variant="primary"
            leftIcon={<Settings size={16} />}
          >
            ذخیره تنظیمات
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-blue-600" />
            مدیریت پیامک
          </h1>
          <p className="text-gray-600 dark:text-gray-400">ارسال پیامک به مشتریان و مدیریت قالب‌ها</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-reverse space-x-8">
            {[
              { id: 'send', label: 'ارسال پیام', icon: Send },
              { id: 'templates', label: 'قالب‌ها', icon: MessageSquare },
              { id: 'logs', label: 'تاریخچه', icon: Clock },
              { id: 'settings', label: 'تنظیمات', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'send' && renderSendTab()}
      {activeTab === 'templates' && renderTemplatesTab()}
      {activeTab === 'logs' && renderLogsTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowTemplateModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingTemplate ? 'ویرایش قالب' : 'قالب جدید'}
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نام قالب</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="input"
                    placeholder="نام قالب"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">متن قالب</label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => {
                      const content = e.target.value;
                      const variables = extractVariables(content);
                      setTemplateForm({ 
                        ...templateForm, 
                        content,
                        variables
                      });
                    }}
                    className="input"
                    rows={4}
                    placeholder="متن قالب با متغیرها مثل {customerName}"
                  />
                </div>

                {templateForm.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">متغیرهای شناسایی شده</label>
                    <div className="flex flex-wrap gap-2">
                      {templateForm.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded"
                        >
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateModal(false)}
                >
                  انصراف
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTemplateSubmit}
                >
                  {editingTemplate ? 'به‌روزرسانی' : 'ایجاد قالب'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSManagement;