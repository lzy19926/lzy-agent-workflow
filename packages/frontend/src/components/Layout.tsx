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
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 20, marginRight: 24 }}>
          VideoMemo
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          items={menuItems}
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: '24px 48px', background: colorBgContainer, borderRadius: borderRadiusLG, margin: '16px 48px' }}>
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
