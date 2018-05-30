var carInUpdate = {
	intime: '',
	carNum: '',
	md5: ''
};
const parkingIn = {
	data(){
		return {
			carInTypeOption: [{
				value: '1',
				label: '小型车'
			}, {
				value: '2',
				label: '大型车'
			}],
			carInType: '1',
			preInserting: false,
		}
	},
	methods: {
		In: function(last){
			const that = this;
			axios.get(config.cin + '?station_id=' + config.station_id + '&last='+last).then(function (res) {
				setTimeout(() => {
					that.In(carInUpdate.md5)
				}, 500);

				if(res.data){
					
					if(res.data.carNum == '无牌车'){
						res.data.carNum = ['无','牌', '车', '','','','',''];
						res.data.carEnterType = 'insert';
					} else {
						res.data.carEnterType = 'default';
						var arr = new Array(8);
						for(var i = 0; i < res.data.carNum.length; i++){
							arr[i] = res.data.carNum[i];
						}
						res.data.carNum = arr;
						that.openInGate()
					}

					carInUpdate.md5 = res.data.md5;

					if(carInUpdate.intime !== '' && res.data.intime - carInUpdate.intime < 2){
						console.log('极限入场时间内',carInUpdate.intime, res.data.intime,  carInUpdate.intime - res.data.intime)
						return;
					}
					if(res.data.carNum.join('') !== '无牌车'){
						if(carInUpdate.carNum == res.data.carNum.join('') && that.diffDate(carInUpdate.intime * 1000, res.data.intime * 1000)) {
							console.log('car in number repeat')
							return;
						} 
					}

					carInUpdate.intime = res.data.intime;
					carInUpdate.carNum = res.data.carNum.join('');
					res.data.closeup_pic = '';
					res.data.picture = '';


					that.sendLEDMessage('in', res.data.carNum.join(''), '欢迎光临');
					
					res.data.closeup_pic = config.server + '/img?uri='+res.data.plateimage_filename
					res.data.picture = config.server + '/img?uri='+res.data.fullimage_filename
					res.data.intime = new Date(parseInt(res.data.intime) * 1000).Format('yyyy-MM-dd hh:mm:ss');
					

					if(that.carIn.length == 0){
						that.carIn.unshift(res.data)
					} else {
						
						// 如果是正常进场直接插入到第一个
						// carEnterType: default 正常进场
						// carEnterType: insert 手动补入
						
						if(that.carIn[0].carEnterType == 'default'){
							res.data.makeup = 1;
							console.log(that.carIn[0].carEnterType, that.carEnterIsEdit)
							if(that.carEnterIsEdit){
								that.carIn.splice(1, 0, res.data)
							} else {
								that.carIn.unshift(res.data)
							}
						} else {
							console.log(that.carIn[0].carEnterType)
							res.data.makeup = 0;
							that.carIn.splice(1, 0, res.data)
						}
					}
				}
			}).catch( res => {
				setTimeout(() => {
					that.In(carInUpdate.md5)
				}, 500);
			})
		},
		// 收费员点击了确认 
		carConfirmEnter: function(){
			const that = this;
			const car = this.carIn[0]

			if(car.carNum[0] != '临'){
				const validVehicleNumber  = this.isVehicleNumber(car.carNum.join(''));
				if(!validVehicleNumber){ this.$layer.msg('请输入正确的车牌号'); return; };
			} else {
				if(car.carNum.join('').length < 3 ){
					this.$layer.msg('请最少输入3位')
					return;
				}
			}

			var requestParams = JSON.stringify({
				'carNum': car.carNum.join(''),
				'intime': new Date(car.intime).getTime() / 1000,
				'color': car.color,
				'makeup': car.makeup,
				'fullimage_filename': car.fullimage_filename,
				'plateimage_filename': car.plateimage_filename
			})

			this.carInSubmitLoading = true;

			// 数据同步
			this.$jquery.ajax({
				type: 'post',
				url: config.sync + '?action=user_in&pid=' + config.pid + '&station_id=' + config.station_id,
				data: {
					content: requestParams
				}
			})
			
			// 提交数据到后台
			this.$jquery.ajax({
				url: config.submitEnter + '?action=user_in&pid=' + config.pid + '&station_id=' + config.station_id,
				type: "POST",
				data: { content: requestParams },
				timeout: 5000,
				dataType: 'json',
				success: function(res){
					that.carInSubmitLoading = false;
					that.carEnterIsEdit = false;
					if (res.error_code == '0') {
						
						that.addedEnterList();
						that.$layer.msg(res.error_msg);

						if(that.carIn.length !== 0){
							that.carInConfirmBtnDisabled = false;
						} else {
							that.carInConfirmBtnDisabled = true;
						}
						if(that.preInserting){
							that.openInGate();
							that.preInserting = false;
						}

						// 删除入场第一个
						that.carIn.shift()

						//限制入场数量
						if(that.alreadyEntered.length > 100){
							that.alreadyEntered.pop()
						}
						
					} else {
						that.carInConfirmBtnDisabled = false;
						that.carConfirmEnter();
						console.log('提交失败， 再次提交中');
					}
				},
				error: function(xhr, status){
					that.carInSubmitLoading = false;
					
					if(xhr.readyState == 0 || xhr.statusText == 'timeout'){
						that.$layer.msg('连接超时！')
						that.carConfirmEnter();
					}
					console.log('user in submit error' + JSON.stringify(xhr), status)
				}
			})
		},

		// 入场补入
		insertCarRecord: function(){
			this.preInserting = true;
			if(!debug){
				axios.get(config.bupai+'?station_id='+config.station_id+'&inout=in').then();
			}
		},

	}
}

module.exports =  parkingIn;