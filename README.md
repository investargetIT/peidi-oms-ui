# 开发
1.构建镜像
```
./build.sh
```
2.运行容器
```
./run.sh
```
3.访问 http://localhost:8000 查看界面
# 发布 
1.生成静态文件，静态文件会生成在 `/dist` 目录下
```
docker exec shunwei-oms-ui npm run build
```
2.上传静态页面到服务器
```
scp -r dist/* root@ip地址:/srv/shunwei-oms-ui
```
# 环境变量
1. 在`.env`文件中设置环境变量（别忘了修改`.env.example`文件）
2. 在`/config/config.ts`文件的`define`部分引入环境变量
3. 在代码中使用环境变量`process.env.NAME`
