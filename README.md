# lambda s3-resizer

使用 lambda 生成 s3 图片缩略图

## 基于下面的仓库二次开发

https://github.com/sagidM/s3-resizer

## 缩略图路径规则

```
举例：
原图地址 /images/cover.jpg
缩略图地址 /images/cover.jpg_w100.webp   // 规则 ${sourcePath}_${ w | h}${targetSize}.${ webp | jpg }
```

## 部署

```
--
# 配置lambda
1. 添加lambda函数
2. 上传项目zip (npm install后 将项目压缩为zip)
3. 修改环境变量
   BUCKET	xxxx // s3 bucket name
   ENDPOINT https://xxxx.cloudfront.net  // s3 前台地址
   WHITELIST	w750 w240 w75  // 可用的缩放规格
4. 添加触发器
   类型选 API Gateway，得到api地址 如：https://xxxx.execute-api.us-east-2.amazonaws.com/default/s3_image_resize

--
# 配置s3
1. 开启静态网站托管
属性标签里 ，重定向规则设置为：
[
    {
        "Condition": {
            "HttpErrorCodeReturnedEquals": "404"
        },
        "Redirect": {
            "HostName": "xxx.execute-api.us-east-2.amazonaws.com",  // 这里为api的域名
            "HttpRedirectCode": "307",
            "Protocol": "https",
            "ReplaceKeyPrefixWith": "/default/s3_image_resize?path="  // 这里是api的路径，带上path参数
        }
    }
]
保存后得到 静态网站地址！！ 如:  http://xxx.s3-website.us-east-2.amazonaws.com
2. 创建生命周期规则（可选）
管理标签里  对象标签 category: image-resize， 设置对应的过期策略。如缩略图保留1天后销毁

--
# 配置cloudfront
源 选择 s3的静态网站地址！！ (这里要注意！！！静态网站地址才有重定向功能)
```
