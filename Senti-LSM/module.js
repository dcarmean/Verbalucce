/*
 Copyright (c) 2013, Intel Corporation
  
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
	http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License
  
 File: module.js
*/

var Module = (function(){

	function Module(id){
		this.id = id;
		var tempPrettyIdSplit = this.id.split(/(?=[A-Z])/);
		var tempPrettyIdJoin = "";
		for(var i = 0;i<tempPrettyIdSplit.length;i++){
			if(i > 0){
				tempPrettyIdJoin += " " + tempPrettyIdSplit[i];
			}
			else{
				tempPrettyIdJoin += tempPrettyIdSplit[i];
			}
		}
		this.prettyId = tempPrettyIdJoin.toLowerCase();
		this.defaultText = "choose " + this.prettyId;
		this.selections = new Array();
		this.options = new Array();
		this.selectedOptions = new Array();
		this.maxSelectedOptions;
	};

	Module.prototype.returnId = function(){
		return this.id;
	};

	Module.prototype.returnPrettyId = function(){
		return this.prettyId;
	}

	Module.prototype.returnDefaultText = function(){
		return this.defaultText;
	};

	Module.prototype.setOptions = function(optionsArray){
		this.options = optionsArray;
	};

	Module.prototype.returnOptions = function(){
		return this.options;
	};

	Module.prototype.addToSelectedOptions = function(option){
		debug.debug("adding option '"+option+"' to selectedOptions");
		this.selectedOptions.push(option);
	};

	Module.prototype.removeFromSelectedOptions = function(option){
		var index = $.inArray(option,this.selectedOptions);
		debug.debug("index of option '"+option+"' to remove = " + index);
		this.selectedOptions.splice(index,1);
		return index;
	};

	Module.prototype.returnSelectedOptions = function(){
		return this.selectedOptions;
	};

	Module.prototype.setMaxSelectedOptions = function(num){
		this.maxSelectedOptions = num;
	}

	Module.prototype.returnMaxSelectedOptions = function(){
		return this.maxSelectedOptions;
	}

	Module.prototype.returnOptionValueById = function(id){
		for(var i=0;i<this.options.length;i++){
			if(this.options[i]['id'] == id){
				return this.options[i]['value'];
			}
		}
	}

	return Module;
})();