const componentInformation = Vue.component('payInformation', {
	data(){
		return {
			charge_detail: false,
		}
	},
	props: ['total'],
	methods: {
		// 展开收起详情
		ExpandDetail: function ExpandDetail() {
			this.charge_detail = !this.charge_detail;
		},

		checkChargeDetaiVisible(){
			this.$emit('show-detail')
		}
	},
	template: `<div class="top">
		        <div class="charg_detail" :class="{'open': charge_detail}" @click="ExpandDetail">
		            <span >收费详情 <i></i></span> 
		        </div>
		        <transition name="el-zoom-in-top"><div  v-if="charge_detail" class="top_charge_flex">
		          <div class="item green">
		              <div class="col_3">
		                <i class="icon"></i>
		              </div>
		              <div class="col_7">
		                <div class="charge_right">
		                  <p>收费金额总额</p>
		                  <h1>{{total.total_amount}}</h1>
		                </div>
		              </div>
		            </div>
		            <div class="item blue">
		              <div class="col_3">
		                <i class="icon"></i>
		              </div>
		              <div class="col_7">
		                <div class="charge_right">
		                  <p>现金收费总额</p>
		                  <h1>{{total.offline}}</h1>
		                </div>
		              </div>
		            </div>
		            <div class="item yellow">
		              <div class="col_3">
		                <i class="icon"></i>
		              </div>
		              <div class="col_7">
		                <div class="charge_right">
		                  <p>线上收费总额</p>
		                  <h1>{{total.online}}</h1>
		                </div>
		              </div>
		            </div>
		            <div class="item orange view_cursor" @click="checkChargeDetaiVisible">
		              <div class="col_3">
		                <i class="icon"></i>
		              </div>
		              <div class="col_7">
		                <div class="charge_right" >
		                  <p class="charge_right_text">查看收费详情</p>
		                </div>
		              </div>
		            </div>
		        </div>
		      </div></transition>`
})




module.exports = componentInformation