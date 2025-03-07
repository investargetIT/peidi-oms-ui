import { history, request } from '@umijs/max';
import React, { useEffect, useState } from 'react';
import { initDingH5RemoteDebug } from "dingtalk-h5-remote-debug";
import * as dd from 'dingtalk-jsapi';

const DDLoginFree: React.FC = () => {

  const [errMsg, setErrMsg] = useState<string>();

  useEffect(() => {
    console.log('mounted');
    if (dd.env.platform === 'notInDingTalk') {
      setErrMsg('请在钉钉客户端打开');
      return;
    }

    initDingH5RemoteDebug();
    let ddUserEmail = '';
    dd.runtime.permission.requestAuthCode({
      corpId: process.env.DINGTALK_CORP_ID, // 企业id
      onSuccess: function (info) {
        console.log(info);
        const { code } = info;
        // 通过该免登授权码可以获取用户身份
        request(process.env.BASE_URL + '/ding/userInfo?code=' + code).then(res => {
          console.log(res);
          if (res.success) {
            const { data: ddUserInfo } = res;
            console.log('ddUserInfo', ddUserInfo);
            const { org_email, name } = ddUserInfo;
            if (org_email) {
              console.log('ddEmail', org_email);
              ddUserEmail = org_email;
              // 获取到钉钉用户企业邮箱，调用注册接口
              return request(process.env.USER_AUTH_BASE_URL + '/user/email-register', {
                method: 'POST',
                data: {
                  email: org_email,
                  emailCode: '',
                  password: process.env.DINGTALK_LOGIN_FREE_DEFAULT_PASSWORD,
                  username: name,
                },
              });
            } else {
              setErrMsg('获取钉钉用户企业邮箱失败：' + JSON.stringify(res));
            }
          } else {
            setErrMsg('获取钉钉用户信息失败：' + JSON.stringify(res));
          }
        }).then(res => {
          if (res) {
            if (res.success || (res.code === 100100002 && res.msg === 'EMAIL_ACCOUNT_ALREADY_EXIST')) {
              // 注册成功，调用登录接口
              return request(process.env.USER_AUTH_BASE_URL + '/user/login/password', {
                method: 'POST',
                data: `username=${ddUserEmail}&password=${process.env.DINGTALK_LOGIN_FREE_DEFAULT_PASSWORD}`,
              });
            } else {
              setErrMsg('用户注册失败：' + JSON.stringify(res));
            }
          }
        }).then(res => {
          if (res) {
            if (res.success) {
              localStorage.setItem('token', res.data);
              // 登录成功，跳转到指定页面
              const urlParams = new URL(window.location.href).searchParams;
              window.location.href = urlParams.get('redirect') || '/';
            } else {
              setErrMsg('用户登录失败：' + JSON.stringify(res));
            }
          }
        });
      },
      onFail: function (err) {
        setErrMsg('获取钉钉免登授权码失败：' + JSON.stringify(err))
      },
    });
  }, []);

  return <h1>{errMsg}</h1>;
};

export default DDLoginFree;
