import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, theme } from 'antd';
import { IeOutlined, HistoryOutlined, SettingOutlined, CodeOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Content } = AntLayout;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <IeOutlined />,
      label: '视频解析',
    },
    {
      key: '/analysis',
      icon: <CodeOutlined />,
      label: '代码分析',
    },
    {
      key: '/analysis-history',
      icon: <HistoryOutlined />,
      label: '分析历史',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '视频历史',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  return (
    <AntLayout className="min-h-screen">
      {/* Header - 使用 Tailwind 的 flex 布局类 */}
      <Header className="flex items-center justify-between px-6 py-0 bg-black/80">
        {/* Logo 区域 */}
        <div className="text-white text-2xl font-bold mr-6">
          VideoMemo
        </div>

        {/* 导航菜单 - 使用 Tailwind 的 flex-1 和 min-w-0 */}
        <Menu
          theme="dark"
          mode="horizontal"
          items={menuItems}
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          className="flex-1 min-w-0"
          style={{ flex: '1 1 0%' }}
        />
      </Header>

      {/* Content - 使用 Tailwind 的间距和背景色类 */}
      <Content
        className="m-4 p-6"
        style={{
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
