const util = require('./scripts/util.js');
const parkingIn = require('./scripts/carInParking.js')


var carOutUpdate = {
	outtime: '',
	carNum: '',
	md5: ''
};



const vm = new Vue({
	el: '#app',
	mixins: [wechatPay, parkingIn],
	data: function(){
		return {
			carEnterIsEdit: false,
			queryInVisible: false,
			queryInCarNum: '',
			carInQueryData: [],
			queryInLoading: false,

			//临牌车
			queryTemporaryVisible: false,
			temporaryData: [],

			page_numer_specified:1,
			logData: [],
			querycarno: '',
			page_numer: 1,
			nextDisabled: false,
			chargeDetailPanelVisible: false,
			visible: false,
			charge_detail: false,
			carInSubmitLoading: false,
			switch_car: false,
			
			
			cid: undefined,
			form: {
				name: '',
				password: ''
			},
			rules: {
				name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
				password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
			},
			username: '',
			loginTime: '',
			carIn: [],
			carOut: [],
			specialType: '',
			revenue: '',		//特殊实收金额
			
			pickerOptions: {
				disabledDate(time) {
					return time.getTime() > Date.now();
				}
			},
			alreadyEntered: [],
			signLoading: false,
			passwordFocus: false,
			previewImageVisible: false,
			previewSrc: '',
			total: {},
			wechatPayTimeout: null
		}
	},
	computed: {
		carInConfirmBtnDisabled: function(){
			return this.carIn.length == 0;
		},
		insertDisabled: function(){
			return this.preInserting;
		}
	},
	mounted(){
		const that = this;
		this.$jquery = jQuery.noConflict();
		
		layui.use(['layer'], function () {
			that.$layer = layui.layer;
		});
		console.log(parkingIn)
		setTimeout( () => {
			if(config){
				this.checkLogin()
			} else {
				console.log('config load fail!')
			}
		}, 500)

		setInterval( ()=> {
			util.removeLog();
		}, 10000)


	},
	destroyed(){

	},
	methods: {

		tabInput: function(){
			this.$refs['passwordFocus'].focus();
		},
		Out: function( last ){
			const that = this;
			axios.get(config.cout + '?station_id=' + config.station_id + '&last=' + last).then(function (res) {

				setTimeout( () => {
					that.Out(carOutUpdate.md5)
				}, 500)

				if(that.carOut.length > 4){
					that.carOut.pop();
				}

				if(res.data == '') return;
				if(that.carOut.length !== 0 && that.carOut[0].isConfirm == false) return;

				that.scrollTop();
				carOutUpdate.md5 = res.data.md5;

				if(carOutUpdate.outtime !== '' && res.data.outtime - carOutUpdate.outtime < 2){
					console.log('极限出场时间内',carOutUpdate.outtime, res.data.outtime,  carOutUpdate.outtime - res.data.outtime)
					return;
				}
				if(carOutUpdate.carNum == res.data.carNum && that.diffDate(carOutUpdate.outtime * 1000, res.data.outtime * 1000)) {
					console.log('car out number repeat')
					return;
				} else {
					carOutUpdate.outtime = res.data.outtime;
					carOutUpdate.carNum = res.data.carNum;
				}

				if(res.data.outtime == ''){
					res.data.carOuttimeReadonly = false;
				} else {
					res.data.carOuttimeReadonly = true;
				}
				that.preOut({
					carNum: res.data.carNum,
					outtime: res.data.outtime,
					color:   res.data.color
				}, 0)
				var carNum = res.data.carNum;
				if(res.data.carNum == '无牌车'){
					res.data.carNum = ['无','牌', '车', '','','','',''];
					res.data.makeup = 1;
				} else {
					var arr = new Array(8);
					for(var i = 0; i < res.data.carNum.length; i++){
						arr[i] = res.data.carNum[i]
					}
					res.data.carNum = arr
					res.data.makeup = 0;
				}	

				res.data.closeup_pic = config.server + '/img?uri='+res.data.plateimage_filename
				res.data.picture = config.server + '/img?uri='+res.data.fullimage_filename

				res.data.intime = new Date(parseInt(res.data.intime) * 1000).Format('yyyy-MM-dd hh:mm:ss');
				res.data.outtime = new Date(parseInt(res.data.outtime) * 1000).Format('yyyy-MM-dd hh:mm:ss');
				res.data.isConfirm = false;		// 是否确认
				res.data.switch_car = false;	// 全景图与车牌号的确认
				res.data.special = false;			// 特殊面板的是否显示
				res.data.interference = false;			// 是否进行了人工操作
				res.data.loadingText = '数据提交中';			

				that.carOut.unshift(res.data)

			}).catch( res => {
				setTimeout(() => {
					that.Out(carOutUpdate.md5)
				}, 500);
			})
		},
		getImg: function(url){
			return new Promise( function(resolve, reject)  {
				axios.get(config.img+'?uri='+url)
					.then( res => {
						resolve( res )
					})
					.catch( res => {
						reject( res )
					})
			})
		},
		previewImage( src ){
			this.previewImageVisible = true;
			this.previewSrc = src;
		},
		getNowPay( param, index){
			const that = this;
			return new Promise( resolve => {
				function _get(){
					that.$jquery.ajax({
						// url: config.server+'/api/is_pay.php',
						url:config.checkpay,
						type: 'POST',
						data: param,
						timeout: 5000,
						dataType: 'json',
						success( res ){
							if(res.pay == 0 &&  !that.carOut[index].isConfirm){
								that.wechatPayTimeout = setTimeout(() => {
									_get( param )
								}, 2000)
							} else {
								clearTimeout(that.wechatPayTimeout)
								resolve( res )
							}
						},
						error( err ){ 
							that.wechatPayTimeout = setTimeout(() => {
								_get( param )
							}, 2000)
							resolve( err )
						}
					})
				}

				_get();
			})
		},
		preOut: function( preData, index ){
			const that = this;
			const content = preData;

			this.$jquery.ajax({
				url: config.preout + '&pid=' + config.pid + '&station_id=' + config.station_id,
				type: 'POST',
				data: {
					content: JSON.stringify(content)
				},
				timeout: 5000,
				dataType: 'json',
				success: function( res ){

					// 预出场相关日志输出
					var appendFileLog = res;
					var date = new Date().Format('yyyy-MM-dd hh:mm:ss');
					var autoOpen = res.open == 1 ? '自动起竿': '手动起竿';
					appendFileLog.carNumber = JSON.stringify(content);
					appendFile('pre_out_log.txt', date+'\r'+JSON.stringify(appendFileLog)+'\r' +autoOpen+ '\r\n\n' )

					that.carOut[index].intime = res.intime == '' ? '' : new Date(res.intime);
					that.carOut[index].money = res.money;
					that.carOut[index].payway = res.payway;
					that.carOut[index].stay = res.stay;
					that.carOut[index].tip = res.tip;
					that.carOut[index].carIntimeReadonly = res.intime == '' ? false : true;
					that.carOut[index].isPay = false


					// 如果出场的时候没有匹配到入场时间，则可以无限次的修改入场时间
					// 2018-04-19
					if(that.carOut[index].intimeEdit !== undefined){
						that.carOut[index].carIntimeReadonly = that.carOut[index].intimeEdit ? false : true;
					}
					

					if(that.carOut[index].intime == ''){
						that.carOut[index].interference = true; 
					}


					// 如果是现金支付 并且 停车费不等于0的时候 获取用户在停车出口的支付情况
					if(res.payway == '' && res.money != 0 && !that.carOut[index].special){

						// 显示屏二维码
						console.log(config.monitor)
						that.$jquery.get(config.monitor+'/carout?car='+res.carnum+'&pid='+config.pid, function(res){
							console.log( res )
						})
						that.getNowPay({pid: config.pid, car: res.carnum }, index).then( res => {
							that.carOut[index].payway = res.payway
							that.carOut[index].isPay = true
							that.carConfirmedOut(0);
							that.openOutGate();
						})
					} 

					// setTimeout( () => {
					// 	this.$jquery.ajax({	
					// 		url: config.sendError,
					// 		type: 'POST',
					// 		timeout: 8000,
					// 		data: {
					// 			pid: config.pid,
					// 			station_id: config.station_id,
					// 			warning: 1000,
					// 			tip:"用户支付疑似障碍",
					// 			carnum: that.carOut[index].carNum
					// 		},
					// 		dataType: 'json',
					// 		success: function( res ){
					// 			console.log( res )
					// 		}
					// 	})
					// }, 30000)

					if (res.open == 1 && !that.carOut[index].interference) {
						that.carOut[index].disabled = true;
						that.carOut[index].isConfirm = true;
						that.carOut[index].carNum = that.carOut[index].carNum.join('');
						console.log('interference')
						that.carConfirmedOut(0);
						
						that.openOutGate();
						window.removeEventListener('keydown', that.hotKeyBoard)
					} 

					that.sendLEDMessage('out', res.carnum, res.tip);
					window.addEventListener('keydown', that.hotKeyBoard)
				}, 
				error: function(xhr, status){
					console.log(xhr)
					if(xhr.readyState == 0 || xhr.statusText == 'timeout'){
						that.$layer.msg('连接超时！')
					}
					console.log('request preout Api timeout!')
				}
			})
		},
		hotKeyBoard: function(event){
			if(this.queryTemporaryVisible || this.queryInVisible) return;
			if(event.key == 'Enter' || event.keyCode == 13 || event.key == ' ' || event.keyCode == 32 && this.carOut[0].isConfirm){
				event.preventDefault();
				this.carConfirmedOut(0)
			}
		},
		specialToCharges: function(index) {
			this.carOut[index].special = true;
		},
		specialCancel: function( index ){
			this.carOut[index].special = false;
		},
		specialConfirm: function( index ){
			if(this.specialType == '' || this.revenue == '' ){
				this.$layer.msg('请填写原因和实收金额')
				return;
			}
			console.log('special pay commit!')
			this.carConfirmedOut( index );
		},
		switchItemPreview: function( index){
			this.carOut[index].switch_car = !this.carOut[index].switch_car;
		},
		carConfirmedOut: function(index) {
			const that = this;
			if(this.carOut[index].intime == ""){
				this.$layer.msg('请填写入场时间')
				return
			}
			
			var carnum = this.carOut[index].carNum;
			if(util.isArray(carnum)){
				carnum = this.carOut[index].carNum.join('');
			} else {
				carnum = this.carOut[index].carNum;
			}

			const content = {
				"carNum": carnum,
				"outtime":new Date(this.carOut[index].outtime).getTime() / 1000,
				"color":  this.carOut[index].color,
				"money":  this.revenue,
				"reason": this.specialType,
				"makeup": this.carOut[index].makeup
			}

			// 出场同步提交
			this.$jquery.ajax({	
				url: config.syncout + '?action=user_out&pid=' + config.pid + '&station_id=' + config.station_id,
				type: 'POST',
				timeout: 8000,
				data: {
					content: JSON.stringify(content)
				}
			})
			
			// 正式出场
			this.$jquery.ajax({
				url: config.out + '&pid=' + config.pid + '&station_id=' + config.station_id,
				type: 'POST',
				timeout: 8000,
				data: {
					content: JSON.stringify(content)
				},
				dataType: 'json',
				success: function( res ){
					that.disabledBodyScroll()
					that.carOut[index].intime = new Date(res.intime);
					that.carOut[index].money = res.money;
					if(!that.carOut[index].isPay){
						that.carOut[index].payway = res.payway;
					}
					that.carOut[index].carNum = carnum;
					that.carOut[index].isConfirm = true;
					that.carOut[index].special = false;
					that.carOut[index].carIntimeReadonly = true;
					that.carOut[index].tip = res.tip;
					that.scrollTop()
					that.revenue = ''
					that.specialType = ''
					if(!debug){
						that.openOutGate()
					}	

					// 清除现场支付的请求回调
					if(that.wechatPayTimeout){
						clearTimeout( that.wechatPayTimeout)
					}

					// 出场相关日志输出
					var date = new Date().Format('yyyy-MM-dd hh:mm:ss');
					var temp = `日期： ${date}\r提交数据: ${JSON.stringify(content)}\r响应数据: ${JSON.stringify(res)};\r状态: 出场提交成功\r\r\n`;
					appendFile('car_confirmed_out.txt', temp )

					
					window.removeEventListener('keydown', that.hotKeyBoard)
					that.getTotal();


					// 通知服务端隐藏二维码
					that.$jquery.get(config.monitor+'/hide')
				}, 
				error: function(xhr, status){
					// 出场相关日志输出
					var date = new Date().Format('yyyy-MM-dd hh:mm:ss');
					var temp = `日期： ${date}\r提交数据: ${JSON.stringify(content)}\r响应数据: ${JSON.stringify(xhr)};\r状态: 出场提交失败\r\r\n`;
					appendFile('car_confirmed_out.txt', temp )

					console.log('out error recommit')
					setTimeout( () => {
						that.carConfirmedOut( index )
					}, 1000)
				}
			})
		},

		changeInTime: function( index ){
			this.carOut[index].interference = true;
			this.carOut[index].intimeEdit = true;
			this.preOut({
				carNum: this.carOut[index].carNum.join(''),
				intime: new Date(this.carOut[index].intime).getTime() / 1000,
				outtime: new Date(this.carOut[index].outtime).getTime() / 1000,
				color:  this.carOut[index].color
			}, index)
		},
		disabledBodyScroll: function(){
			document.body.style.overflow = 'hidden';

			setTimeout( () => {
				document.body.style.overflow = '';
			}, 2000)
		},
		
		editingCarNum: function(){
			console.log('正在编辑')
			this.editing = true;
		},
		editEnterCar: function(){
			console.log('入场车辆正在被编辑')
			this.carEnterIsEdit = true;
		},
		changeShift: function changeShift() {
			this.visible = true;
		},
		
		
		switch_car_handle: function(){
			this.switch_car = !this.switch_car;
		},
		diffDate: function(s, e){
			return new Date(e).getTime() - new Date(s).getTime() <= 60000
		},
		// 添加至进场确认列表
		addedEnterList: function addedEnterList() {

			if(this.alreadyEntered.length == 0){
				this.alreadyEntered.push({
					num: this.carIn[0].carNum.join(''),
					time: this.carIn[0].intime
				});
			} else {
				this.alreadyEntered.unshift({
					num: this.carIn[0].carNum.join(''),
					time: this.carIn[0].intime
				});
			}

		},

		// 车辆补拍
		bupai: function(inout) {
			var that = this;
			this.$jquery.get(config.bupai + '?station_id=' + config.station_id+'&inout='+inout, function (res) {
				that.$layer.msg('补拍成功');
			});
		},
		closeCarSelectPanel: function closeCarSelectPanel() {
			this.carSelectPanel = false;
			this.carNumber = this.catchCarNumber;
		},
		updatePreOutNumber: function(val, index){
			if(!this.carOut[index].isConfirm){
				this.carOut[index].interference = true;
				this.preOut({
					carNum: val.join(''),
					outtime: new Date(this.carOut[index].outtime).getTime() / 1000,
					color:   this.carOut[index].color
				}, index)
			}
		},
		openOutGate: function openOutGate() {
			var that = this;
			this.$jquery.get(config.openOut + '?station_id=' + config.station_id, function (res) {
				that.$layer.msg('出场起竿成功');
			});
		},
		
		// 总金额
		getTotal: function() {
			var that = this;
			this.post(config.total, { cid : that.cid }).then( res => {
				if (res.error_code == '0') {
					that.total = res.data;
				} else {
					that.$layer.msg(res.msg);
				}
			}).catch( error => {
				that.$layer.msg(error)
			})
		},
		switchCarHandler: function( index ){ },
		checkLogin: function checkLogin(){
			var user = sessionStorage.getItem('user');

			if(!user){
				this.visible = true;
			} else {
				const user = JSON.parse(sessionStorage.getItem('user'));
				const cid = user.cid;
				this.cid  = cid;
				this.username = user.username
				this.loginTime = new Date(Date.now()).Format('yyyy-MM-dd hh:mm:ss');
				this.getTotal();
				this.In('');
				this.Out('');
			}
		},
		tollCollectorLogin: function tollCollectorLogin() {
			const _this2 = this;
			const that = this;
			this.signLoading = true;
			this.$jquery.post(config.login, {
				username: that.form.name,
				password: that.form.password,
				station_id: config.station_id,
				pid: config.pid
			}, function (res) {
				that.signLoading = false;
				if (res.error_code == 0) {
					_this2.$message({
						type: 'success',
						message: '登录成功'
					});

					sessionStorage.setItem('user', JSON.stringify(res.data))
					_this2.visible = false;
					_this2.username = res.data.username;
					_this2.loginTime = new Date(Date.now()).Format('yyyy-MM-dd hh:mm:ss');
					_this2.cid = res.data.cid;
					_this2.getTotal();
					_this2.In('');
					_this2.Out('');
				} else {
					_this2.$message({
						type: 'error',
						message: res.msg
					});
				}
			}, 'json');
		},
		submitForm: function submitForm(formName) {
			var _this = this;
			this.$refs[formName].validate(function (valid) {
				if (valid) {
					_this.tollCollectorLogin();
				} else {
					console.log('error submit!!');
					return false;
				}
			});
		},
		sendLEDMessage: function(inout, carNum, tip){
			console.log('sendLEDMessage :', inout, carNum, tip)
			this.$jquery.post(config.led, {
				station_id: config.station_id,
				inout: inout,
				carnum: carNum,
				tip: tip
			}, res => {})
		},
		openInGate: function openInGate() {
			var that = this;
			this.$jquery.get(config.open_in + '?station_id=' + config.station_id, function (res) {
				console.log('入场起竿！');
				that.$layer.msg('入场起竿成功');
			});
		},
		inConfirm: function(){
			alert('confirm')
		},
		isVehicleNumber: function(vehicleNumber) {
			var result = false;
			if (vehicleNumber.length <= 8){
			  var express = /^[测临京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4,5}[A-Z0-9挂学警港澳]{1}$/;
			  result = express.test(vehicleNumber);
			}
			return result;
		},
		checkChargeDetaiVisible: function(){
			this.chargeDetailPanelVisible = true;
			this.log(this.cid, 1, '')
		},
		page: function( direction ){
			if(direction == 'prev')
			{
				this.page_numer--
			} else {
				this.page_numer++
			};

			this.log(this.cid, this.page_numer)
		},
		viewSpecifiedPage: function(){
			this.log(this.cid, this.page_numer_specified)
		},
		handleQuerycarno: function(){
			this.log(this.cid, this.page_numer, this.querycarno)
		},
		log: function(cid, page, carno = ''){
			const that = this;
			const requestParams = {
				cid: cid,
				carno:carno,
				page: page
			}

			this.post(config.api+'/api/parking_log.php', requestParams).then( response => {
				if(response.error_code == '0'){
					this.logData = response.data;
					this.page_numer = page;
					this.nextDisabled = response.data.length ? false : true;
				} else {
					this.$layer.msg(response.msg)
				}
			}).catch( error => {
				console.log(error)
				this.$layer.msg('连接超时！')
				this.logData = [];
			})
			
		},
		queryIn: function(){
			this.queryInVisible = true;
		},
		handleQueryIn: function( page ){
			const that = this;
			var page = 1;
			if(this.queryInCarNum == ''){
				this.$layer.msg('请输入要查询的车牌号')
				return;
			}
			const requestParams = {
				pid: config.pid,
				carno: that.queryInCarNum,
				page: page
			}

			this.queryInLoading = true;
			this.post(config.carin, requestParams).then( res => {
				this.queryInLoading = false;
				if(res.error_code == '0'){
					this.carInQueryData = res.data;
					this.carInQueryData.forEach( (item, index) => {
						item.plateimage_filename = config.server+'/img?uri='+item.plateimage_filename
						item.fullimage_filename = config.server+'/img?uri='+item.fullimage_filename
					})
				} else {
					this.$layer.msg(res.error_msg)
				}
			}).catch( res => {
				this.queryInLoading = false;
				this.$layer.msg('连接超时！')
			})
		},
		loginOpenAutoFocus: function(){
			this.$nextTick( function(){
				this.$refs['usernameFocus'].focus();
			})
		},
		scrollTop: function(){
			document.body.scrollTop = document.documentElement.scrollTop = 0;
			document.querySelector('.bottom>.right .plate_container').scrollTop = 0;
		},
		// 查询临牌车
		handleQueryTemporary: function( car ){
			const that = this;
			var page = 1;
			if(car == ''){
				this.$layer.msg('请输入要查询的车牌号')
				return;
			}
			const requestParams = {
				pid: config.pid,
				carno: car,
				page: page
			};

			this.post(config.carin, requestParams).then( res => { 
				if(res.error_code == '0'){
					this.temporaryData = res.data;
					this.temporaryData.forEach( function( item ){
						item.fullimage_filename = config.server + '/img?uri='+ item.fullimage_filename;
						item.plateimage_filename = config.server + '/img?uri='+item.plateimage_filename;
		      		})
				} else {
					this.$layer.msg(res.error_msg)
				}
			}).catch( error => {
				this.queryInLoading = false;
				this.$layer.msg('连接超时！')
			})
		},
		queryLinpai: function(){
			this.queryTemporaryVisible = true;
			this.handleQueryTemporary('临')
		},
		// 匹配临牌车入场记录
		matchInRecord: function( record ){
			this.queryTemporaryVisible = false;
			
			console.log('确认临牌车的匹配记录', record)

			if(this.carOut.length > 0){
				const out = this.carOut[0];

				if(!out.isConfirm){		//只有没有确认才匹配入场记录
					out.intime = new Date(record.intime);
					out.carNum = record.carno.split('');
					this.getImg(record.plateimage_filename).then( res => {
						out.plateimage_filename = record.plateimage_filename
					})

					this.getImg(record.fullimage_filename).then( res => {
						out.fullimage_filename = record.fullimage_filename
					})

					this.preOut({
						carNum: out.carNum.join(''),
						intime: util.timestampToUnix(out.intime),
						outtime: util.timestampToUnix(out.outtime),
						color:   out.color
					}, 0)
				}
			}
		},
		get: function(url, body){
			return new Promise( (resolve, reject) => {
				axios.get(url).then( res => {
					resolve(res.data)
				}).catch( res => {
					reject(res)
				})
			})
		},
		post: function(url, body){
			return new Promise( (resolve, reject) => {
				axios({
				  url: url,
				  method: 'POST',
				  data: body,
				  timeout: 5000,
				  transformRequest: [function (data) {
				    let ret = '';
				    for (let it in data) {
				      ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&'
				    }
				    return ret
				  }],
				  headers: {
				    'Content-Type': 'application/x-www-form-urlencoded'
				  }
				}).then( res => {
					resolve(res.data)
				}).catch( res => {
					reject(res)
				})
			})
		}
	}
})

