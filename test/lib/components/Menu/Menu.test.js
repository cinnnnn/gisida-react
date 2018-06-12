import React from 'react';
import { Menu }  from '../../../../src/lib/components/Menu/Menu.js'
import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';

//declare certain variables
const componentWrapper = shallow(
	//seems like JSX goes in here 
	<Menu />
);

describe('Menu', () => {
	it('Menu component renders correctly', () => {
		const json = toJson(componentWrapper)
		expect(json).toMatchSnapshot();
	})
});